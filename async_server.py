#!/usr/bin/env python

# WS server example that synchronizes state across clients
import sys
import json
import logging
from UNO_logic import UNO

logging.basicConfig(level=logging.INFO)

USERS = {}
nombres = {}

juego = UNO(6)


def state_event(user):
    jugador = nombres[user]
    return {"type": "estado", "estado": juego.estado(jugador)}


def users_event(mensaje):
    return {"type": "info", "mensaje": mensaje}


def jugada_event(data, jugador):
    if 'type' not in data[jugador]:
        data[jugador]['type'] = "jugada"
    return data[jugador]


def notify_state():
    [queue.append(state_event(user)) for user, queue in USERS.items()]


def notify_users(mensaje):
    [queue.append(users_event(mensaje)) for user, queue in USERS.items()]


def notify_jugada(jugada):
    destinos = ((queue, nombres[user]) for user, queue in USERS.items()
                if nombres[user] in jugada)
    [queue.append(jugada_event(jugada, jugador))
     for queue, jugador in destinos]


def register(client):
    USERS[client] = []
    return [{"type": "presentacion"}]


def presentar(client, jugador):
    nombres[client] = juego.nuevo_jugador(jugador)
    logging.info(f"Se agregó a {nombres[client]}")
    notify_state()


def unregister(client):
    USERS.remove(client)
    mensaje = f"Se perdió conexión de {nombres[client]}"
    del nombres[client]
    logging.info(mensaje)
    notify_users(mensaje)


def retirar(jugador):
    juego.sacar_jugador(jugador)
    logging.info(f"Se eliminó a {jugador}")
    notify_state()


def counter(client, data):
    if client not in USERS:
        return register(client)

    if data["action"] == "estado":
        return [state_event(client)]

    elif data["action"] == "presentacion":
        presentar(client, data['nombre'])

    elif data["action"] == "retirar":
        retirar(data['nombre'])

    elif data["action"] == "jugada":
        jugada = juego.jugada(nombres[client], data["data"])
        if jugada:
            notify_jugada(jugada)

    else:
        logging.error("unsupported event: {}", data)

    send_this = USERS[client][:]
    USERS[client] = []
    return send_this
