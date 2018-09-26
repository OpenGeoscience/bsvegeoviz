from __future__ import print_function

import os
import sys

import requests


_debug = 'DEBUG_REQUESTS' in os.environ


def set_debug(val=True):
    global _debug
    _debug = val


def to_curl(resp):
    """Generate a curl command from a requests response object."""
    req = resp.request
    command = "curl -X %(method)s -H %(headers)s -d '%(data)s' '%(url)s'"
    headers = ' -H '.join(
        ["'%s: %s'" % (k, v) for k, v in req.headers.items()]
    )
    args = {
        'method': req.method,
        'url': req.url,
        'data': req.body or '',
        'headers': headers
    }
    return command % args, repr(resp.status_code) + ' ' + repr(resp.reason)


def log_request(method, url, **kwargs):
    session = requests.Session()
    response = session.request(
        method=method,
        url=url,
        **kwargs
    )

    if not _debug:
        return response

    try:
        curl, result = to_curl(response)
        print(curl + '\n' + result, file=sys.stderr)
    except Exception:
        pass
    return response


def post(url, **kwargs):
    return log_request('POST', url, **kwargs)


def get(url, **kwargs):
    return log_request('GET', url, **kwargs)
