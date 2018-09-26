from urllib import quote

from girder.plugins.minerva.utility.cookie import getExtraHeaders

from . import logged_requests as requests
from .cookie import bsveRoot


def callBsveFeatureInfo(params, typeNames):
    """Call bsve api for getting information about
    a lat long locaion"""

    baseUrl = bsveRoot() + '/data/v2/sources/geotiles/data/result'
    headers = getExtraHeaders()
    headers.update({'Content-Type': 'application/xml'})

    typeNames = ",".join(typeNames)

    parameters = quote("$filter=names eq {} and query_layers eq {} and request eq getfeatureinfo and exceptions eq application/vnd.ogc.se_xml and feature_count eq 50 and projection eq EPSG:3857 and format eq image/png and geo.bbox eq {} and width eq {} and height eq {} and x eq {} and y eq {} and format_options eq callbak:getLayerFeatures&$format=application/json".format(typeNames, typeNames, params['bbox'], params['width'], params['height'], params['x'], params['y'] ), safe='=&$ ').replace(' ', '+')

    req = requests.get(baseUrl, params=parameters, headers=headers)

    return req.content
