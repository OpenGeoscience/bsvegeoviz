import cherrypy
import urllib


def bsveRoot():
    root = cherrypy.request.cookie.get('bsveRoot').value
    return urllib.unquote(root)
