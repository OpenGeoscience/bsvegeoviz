import time

from girder.api import access
from girder.api.describe import Description, describeRoute
from girder.api.rest import Resource


class TestEndpoint(Resource):
    def __init__(self):
        super(TestEndpoint, self).__init__()
        self.resourceName = 'test'
        self.route('GET', ('wait',), self.wait)

    @access.public
    @describeRoute(
        Description('Test a long running http call.')
        .param('time', 'The time to wait in seconds.',
               required=False, default=300, dataType='integer')
        )
    def wait(self, params):
        time.sleep(float(params.get('time', 300)))
        return {}
