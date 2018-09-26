from girder import events
from . import bsve_wms
from .feature import callBsveFeatureInfo

from .auth import Authentication
from .test import TestEndpoint

def get_layer_info(event):
    # if a baseUrl is present, this is not a bsve data source
    if event.info.get('baseUrl'):
        return

    event.preventDefault()
    response = callBsveFeatureInfo(event.info['params'],
                                   event.info['layers'])
    event.addResponse(response)


def load(info):

    urls = ['/static/built/plugins/bsve/extra/BSVE.API.js']
    events.trigger('minerva.additional_js_urls', urls)

    info['apiRoot'].bsve = Authentication()

    # Add an endpoint for bsve wms dataset
    info['apiRoot'].bsve_datasets_wms = bsve_wms.BsveWmsDataset()

    # Add test endpoints
    info['apiRoot'].test = TestEndpoint()

    events.bind('minerva.get_layer_info', 'bsve', get_layer_info)
