import os
import json
from uuid import uuid1
from flask import Flask, send_from_directory, make_response, request
from async_server import EngineServer
import logging

logging.basicConfig(level=logging.INFO)

# set the project root directory as the static folder, you can set others.
application = Flask(__name__, static_url_path='')

juego = EngineServer()

@application.route('/')
def index():
    return send_from_directory('', "uno.html")

@application.route('/<string:dir_>/<path:path>')
def serve_statics(dir_, path):
    if dir_ not in ('js', 'css', 'data'):
        return make_response('No encontrado.', 404)

    return send_from_directory(dir_, path)

@application.route('/logging')
def logging():
    print(f"[LOGGING]")
    return {'log_id': uuid1()}

@application.route('/engine', methods=['POST'])
def engine():
    data = "no se pudo parsear"
    try:
        data = json.loads(list(request.form.to_dict())[0])
        response = {'mensaje': juego(data['log_id'], data)}
    except Exception as e:
        print(f"Request error: {e}")
        response = {"mensaje": [{"type": "error", "message": f"[SERVER ERROR] {e} con request {data}"}]}
    return response


if __name__ == '__main__':
    application.run()