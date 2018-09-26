#!/usr/bin/env python
# -*- coding: utf-8 -*-

###############################################################################
#  Copyright Kitware Inc. and Epidemico Inc.
#
#  Licensed under the Apache License, Version 2.0 ( the "License" );
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
###############################################################################

import datetime
from base64 import b64encode
import json
from urllib import quote
import traceback

from girder.plugins.jobs.constants import JobStatus
from girder.models.notification import Notification
from girder.models.folder import Folder
from girder.models.item import Item
from girder.plugins.jobs.models.job import Job
from girder.plugins.minerva.utility.minerva_utility import findDatasetFolder, updateMinervaMetadata

from .bsve_wms_styles import BsveWmsStyle
from . import logged_requests as requests


def run(job):
    Job().updateJob(job, status=JobStatus.RUNNING)

    print 'create bsve datasets'

    try:

        kwargs = job['kwargs']
        user = kwargs['user']
        bsveRoot = kwargs['bsveRoot']
        extraHeaders = kwargs['extraHeaders']

        Notification().createNotification(
            type='bsveDatasetUpdating', data=job, user=user,
            expires=datetime.datetime.utcnow() + datetime.timedelta(seconds=30))

        """ Hits the bsve urls """

        # Bsve geoserver (wms get capabilities url)
        wms = bsveRoot + "/data/v2/sources/geotiles/meta/list"

        resp = requests.get(wms, headers=extraHeaders)
        data = json.loads(resp.text)

        existingLayers = getLayers(user)
        newLayers = set()

        for d in data['tiles']:
            typeName = d['name']
            newLayers.add(typeName)

            # For now skip updating layers that always exist.
            # When we have a reliable ingestion time stamp,
            # we should check the creation date and update
            # if the ingestion date is later.
            if typeName in existingLayers:
                continue

            wms_params = {}
            wms_params['type_name'] = typeName
            wms_params['name'] = d.get('title') or d['styles'][0]['title']
            wms_params['abstract'] = d['abstract']
            wms_params['source'] = {'layer_source': 'Reference',
                                    'source_type': 'wms'}
            wms_params['geo_render'] = {'type': 'wms'}
            wms_params['category'] = _get_category(d)
            wms_params['metadata'] = _get_metadata(d)
            layer_type = 'raster' if 'WCS' in d['keywords'] else 'vector'
            createBsveDataset(user, bsveRoot, extraHeaders, wms_params, layer_type)

        # delete layers that no longer exist on the server
        for typeName in existingLayers:
            if typeName not in newLayers:
                item = existingLayers[typeName]
                Item().remove(item)

        Job().updateJob(job, status=JobStatus.SUCCESS)

        Notification().createNotification(
            type='bsveDatasetUpdated', data=job, user=user,
            expires=datetime.datetime.utcnow() + datetime.timedelta(seconds=30))

    except Exception as e:
        print e
        print traceback.print_exc()
        Notification().createNotification(
            type='bsveDatasetError', data=job, user=user,
            expires=datetime.datetime.utcnow() + datetime.timedelta(seconds=30))


def createBsveDataset(user, bsveRoot, extraHeaders, params, layer_type):
    typeName = params['type_name']

    try:
        if params['metadata']:
            layer_info = params['metadata']
        else:
            layer_info = BsveWmsStyle(typeName, bsveRoot=bsveRoot,
                                      extraHeaders=extraHeaders).get_layer_info(layer_type)
    except TypeError:
        layer_info = ""

    # TODO: Add the legend url here once it is
    # ready on bsve side
    name = params['name']

    params['layer_info'] = layer_info
    params['adapter'] = 'bsve'

    legend_url = bsveRoot + "/data/v2/sources/geotiles/data/result?"
    legend_qs = quote("$filter=name eq {} and request eq getlegendgraphic and height eq 20 and width eq 20".format(
        typeName), safe='= ').replace(' ', '+')

    r = requests.get(legend_url + legend_qs, headers=extraHeaders)
    legend = b64encode(r.content)
    params['legend'] = legend

    # dataset = self.constructDataset(name, params)
    folder = findDatasetFolder(user, user, create=True)
    dataset = Item().createItem(name, user, folder, '')
    updateMinervaMetadata(dataset, params)
    return dataset


def _get_category(dataset):
    """Get the category from available layer information"""

    category = [k for k in dataset['keywords']
                if k.startswith('category:')]
    if not category:
        return "Other"
    else:
        return category[0].split(":")[1]


def _get_metadata(dataset):
    """Get the layer metadata if exist"""

    metadata = [k for k in dataset['keywords']
                if k.startswith('layer_info:')]
    if not metadata:
        return ""
    else:
        return json.loads(metadata[0].split("layer_info:")[1])


def getLayers(user):
    folder = findDatasetFolder(
        user, user
    )
    if not folder:
        return []

    items = Folder().childItems(folder)

    layers = {}
    for item in items:
        adapter = item.get('meta', {}).get('minerva', {}).get('adapter')
        name = item.get('meta', {}).get('minerva', {}).get('type_name')
        if adapter == 'bsve':

            # delete duplicates if they exist
            if name in layers:
                Item().remove(item)
            else:
                layers[name] = item

    return layers
