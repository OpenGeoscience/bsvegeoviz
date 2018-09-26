import re
import base64
import cherrypy

from girder.api import access
from girder.api.describe import Description, describeRoute
from girder.api.rest import Resource, RestException
from girder.utility.model_importer import ModelImporter

from . import logged_requests as requests


class Authentication(Resource):
    def __init__(self):
        super(Authentication, self).__init__()
        self.resourceName = 'bsve'

        self.route('GET', ('authentication',), self.authenticate)

    @access.public
    @describeRoute(
        Description('Authenticate with a BSVE token')
        .param('apiroot', 'The BSVE server to authenticate against.',
               required=False, default='https://dev.bsvecosystem.net/api')
        .notes('Pass your BSVE username and authentication token using '
               'HTTP Basic Auth.  Returns a cookie containing a valid '
               'girder token on success.')
        .errorResponse('Missing Authorization header', 401)
        .errorResponse('Invalid BSVE login', 403)
    )
    def authenticate(self, params):
        """Authenticate a user with a BSVE login token.

        This endpoint bypasses the normal authentication scheme and makes
        it possible to login as a user without his/her password.  This
        is a security vulnerability if a user creates an account with
        a login name that is later automatically assigned by the escaping
        mechanism defined in ``_generatePassword``.  Only auto-generated
        accounts should be allowed when this plugin is enabled and
        registration should be set to closed.
        """
        authHeader = cherrypy.request.headers.get('Authorization')
        if not authHeader or not authHeader[0:6] == 'Basic ':
            raise RestException('Use HTTP Basic Authentication', 401)

        try:
            credentials = base64.b64decode(authHeader[6:]).decode('utf8')
            if ':' not in credentials:
                raise TypeError
        except Exception:
            raise RestException('Invalid HTTP Authorization header', 401)

        email, token = credentials.split(':', 1)
        data = self._bsveAuth(
            params.get('apiroot', 'https://dev.bsvecosystem.net/api'),
            email,
            token
        )

        if data is None:
            raise RestException('Invalid BSVE login', 403)

        User = ModelImporter.model('user')
        user = User.findOne({'email': email})

        if not user:
            login = self._generateLogin(email)
            firstName = data.get('firstName', 'First')
            lastName = data.get('lastName', 'Last')

            user = User.createUser(
                login=login,
                password=None,
                firstName=firstName,
                lastName=lastName,
                email=email
            )

        setattr(cherrypy.request, 'girderUser', user)
        token = self.sendAuthTokenCookie(user)
        user['authToken'] = {
            'token': token['_id'],
            'expires': token['expires']
        }

        return user

    def _bsveAuth(self, apiroot, email, token):
        """Validate a BSVE authentication token."""
        data = {
            'authTicket': token,
            'data': {
                'userName': email,
                'authTicket': token
            }
        }
        headers = {
            'Content-Type': 'application/json',
            'harbinger-auth-ticket': token
        }
        resp = requests.post(
            apiroot + '/auth/validatetoken',
            json=data,
            headers=headers
        )
        if not resp.ok:
            return None
        resp = resp.json()
        if resp['status'] == 1:
            return resp['data']
        return None

    def _generateLogin(self, email):
        """Generate a login name from an email address."""
        user = email.lower()

        # This is escape characters that are not valid as girder logins.
        # The goal is to make sure that no two unique email addresses can
        # result in the same login name.
        user = user.replace('-', '---')
        user = user.replace('@', '-at-')
        user = user.replace('_', '-u-')

        # replace all other characters with numbers
        chars = ['bsve.']  # make sure the first char is a letter
        r = re.compile(r'[0-9a-z\-\.]')  # valid characters for login
        for c in user:
            if not r.match(c):
                c = '-0x' + bytes(c).encode('hex') + '-'
            chars.append(c)

        return ''.join(chars)
