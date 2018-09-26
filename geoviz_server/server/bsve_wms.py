from base64 import b64encode
import json
from urllib import quote

from girder.api import access
from girder.api.describe import Description, autoDescribeRoute
from girder.plugins.minerva.utility.minerva_utility import findDatasetFolder
from girder.plugins.minerva.rest.dataset import Dataset
from girder.plugins.minerva.utility.cookie import getExtraHeaders


from . import logged_requests as requests
from .cookie import bsveRoot


class BsveWmsDataset(Dataset):
    def __init__(self):
        self.resourceName = 'bsve_datasets_wms'
        self.route('POST', (), self.createBsveSource)

    @access.user
    @autoDescribeRoute(
        Description('')
        .errorResponse('', 403))
    def createBsveSource(self, params):
        root = bsveRoot()
        extraHeaders = getExtraHeaders()
        wms = root + "/data/v2/sources/geotiles/meta/list"
        user = self.getCurrentUser()

        resp = requests.get(wms, headers=extraHeaders)
        data = json.loads(resp.text)

        needConvert = False

        existingLayers = self.getLayers(user)
        newLayers = set()

        for d in data['tiles']:
            typeName = d['name']
            newLayers.add(typeName)
            if typeName in existingLayers:
                continue
            needConvert = True

        if needConvert:
            job = self.model('job', 'jobs').createLocalJob(
                title='Reference datasets update',
                user=user,
                type='minerva.bsve',
                public=False,
                kwargs={
                    'user': user,
                    'bsveRoot': root,
                    'extraHeaders': extraHeaders
                },
                module='girder.plugins.bsve.create_bsve_dataset_worker',
                async=True)
            self.model('job', 'jobs').scheduleJob(job)
            return job

    def getLayers(self, user):
        folder = findDatasetFolder(
            user, user
        )
        if not folder:
            return []

        items = self.model('folder').childItems(folder)

        layers = {}
        for item in items:
            adapter = item.get('meta', {}).get('minerva', {}).get('adapter')
            name = item.get('meta', {}).get('minerva', {}).get('type_name')
            if adapter == 'bsve':

                # delete duplicates if they exist
                if name in layers:
                    self.model('item').remove(item)
                else:
                    layers[name] = item

        return layers
