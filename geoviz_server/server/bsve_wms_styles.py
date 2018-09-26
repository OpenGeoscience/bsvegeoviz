import xml.etree.ElementTree as ET
from urllib import quote

from girder.plugins.minerva.rest.wms_styles import WmsStyle, wps_template

from . import logged_requests as requests


class BsveWmsStyle(object):

    def __init__(self, type_name, bsveRoot='', extraHeaders=None):
        self._type_name = type_name
        self.bsveRoot = bsveRoot
        self.extraHeaders = extraHeaders

    def _get_min_max_count(self, attribute):
        """Gets the min max and count values for a given
        numeric attribute
        """

        url = self.bsveRoot + "/data/v2/sources/geoprocessing/request"
        headers = self.extraHeaders.copy()
        headers.update({'Content-Type': 'application/xml'})
        xml_data = wps_template(self._type_name, attribute)
        res = requests.post(url,
                            data=xml_data,
                            headers=headers)

        # Means wps is not activated
        if res.status_code == 404:
            return None
        elif 'Exception' in res.text:
            return None
        else:
            prop = {}
            xml_res = ET.fromstring(res.content)
            for elem in xml_res.iter():
                if 'Min' in elem.tag:
                    prop['min'] = elem.text
                elif 'Max' in elem.tag:
                    prop['max'] = elem.text
                elif 'Count' in elem.tag:
                    prop['count'] = elem.text
            return prop

    def _get_attributes(self, xml_response):
        """Gets the attributes from a vectorlayer"""

        attributes = {}

        keys = xml_response\
            .iterfind('.//{http://www.w3.org/2001/XMLSchema}element')

        for elem in keys:
            attribute = {}
            # the_geom should be ignored
            if elem.get('name') != 'the_geom' and elem.get('name') != 'wkb_geometry':

                if elem.get('type') == 'xsd:string':
                    pass
                else:
                    attribute['type'] = 'numeric'
                    attribute['properties'] = self._get_min_max_count(elem.get('name'))
                    attributes[elem.get('name')] = attribute

        return attributes

    def get_layer_info(self, layer_type):
        """ Gets the layer information """

        layer_params = {}

        root = self.bsveRoot
        base_bsve = root + "/data/v2/sources/"
        headers = self.extraHeaders.copy()

        if layer_type == 'vector':
            bsve_wfs = base_bsve + "geofeatures/data/result?"
            wfs_qs = quote("$filter=name eq {} and request eq describefeaturetype&$format=text/xml; subtype=gml/3.1.1".format(
                self._type_name), safe='=&$ ').replace(' ', '+')
            resp = requests.get(bsve_wfs + wfs_qs, headers=headers)
            tree = ET.fromstring(resp.content)
            layer_params['layerType'] = layer_type
            layer_params['subType'] = WmsStyle._get_vector_type(tree)
            layer_params['attributes'] = self._get_attributes(tree)

        elif layer_type == 'raster':
            wcs_url = base_bsve + \
                "geocoverage/data/result?$filter=identifiers eq {}".format(self._type_name)
            resp = requests.get(wcs_url, headers=headers)
            tree = ET.fromstring(resp.content)
            sub_type, bands = WmsStyle._get_bands(tree)
            layer_params['layerType'] = layer_type
            layer_params['bands'] = bands
            layer_params['subType'] = sub_type

        return layer_params
