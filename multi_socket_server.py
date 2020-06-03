#!/usr/bin/env python

# WS server example that synchronizes state across clients
import sys
import asyncio
import json
import logging
import websockets
from UNO_logic import UNO

logging.basicConfig(level=logging.INFO)

USERS = set()
nombres = {}

juego = UNO(6)


def state_event(user):
    jugador = nombres[user]
    return json.dumps({"type": "estado", "estado": juego.estado(jugador)})


def users_event(mensaje):
    return json.dumps({"type": "info", "mensaje": mensaje})


def jugada_event(data, jugador):
    if 'type' not in data[jugador]:
        data[jugador]['type'] = "jugada"
    return json.dumps(data[jugador])


async def notify_state():
    if USERS:  # asyncio.wait doesn't accept an empty list
        await asyncio.wait([user.send(state_event(user)) for user in USERS])


async def notify_users(mensaje):
    if USERS:  # asyncio.wait doesn't accept an empty list
        await asyncio.wait([user.send(users_event(mensaje)) for user in USERS])


async def notify_jugada(jugada):
    destinos = ((user, nombres[user]) for user in USERS
                if nombres[user] in jugada)
    if destinos:
        await asyncio.wait([user.send(jugada_event(jugada, jugador))
                            for user, jugador in destinos])


async def register(websocket):
    USERS.add(websocket)
    await websocket.send(json.dumps({"type": "presentacion"}))


async def presentar(websocket, jugador):
    nombres[websocket] = juego.nuevo_jugador(jugador)
    logging.info(f"Se agregó a {nombres[websocket]}")
    await notify_state()


async def unregister(websocket):
    USERS.remove(websocket)
    mensaje = f"Se perdió conexión de {nombres[websocket]}"
    del nombres[websocket]
    logging.info(mensaje)
    await notify_users(mensaje)


async def retirar(jugador):
    juego.sacar_jugador(jugador)
    logging.info(f"Se eliminó a {jugador}")
    await notify_state()


async def counter(websocket, path):
    # register(websocket) sends user_event() to websocket
    await register(websocket)
    try:
        # await websocket.send(state_event(websocket))
        async for message in websocket:

            data = json.loads(message)
            logging.info(f" <<< {nombres.get(websocket, '-nuevo-')} - {data}")

            if data["action"] == "estado":
                await websocket.send(state_event(websocket))

            elif data["action"] == "presentacion":
                await presentar(websocket, data['nombre'])

            elif data["action"] == "retirar":
                await retirar(data['nombre'])

            elif data["action"] == "jugada":
                jugada = juego.jugada(nombres[websocket], data["data"])
                if jugada:
                    await notify_jugada(jugada)

            else:
                logging.error("unsupported event: {}", data)

    finally:
        await unregister(websocket)


start_server = websockets.serve(counter, "localhost", 6789)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()