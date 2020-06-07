#!/usr/bin/env python

# WS server example that synchronizes state across clients
import sys
import json
import logging
from traceback import print_exc
from UNO_logic import UNO

logging.basicConfig(level=logging.INFO)


class EngineServer():
    def __init__(self):
        self.USERS = {}
        self.nombres = {}
        self.juego = UNO()

    def state_event(self, user):
        print(f"state_event:\n\tuser {user}\n\tnombres {self.nombres}")
        estado = self.juego.estado(self.nombres[user])
        return {"type": "estado", "estado": estado} if estado else {}

    def users_event(self, mensaje):
        return {"type": "info", "mensaje": mensaje}

    def jugada_event(self, data, jugador):
        if 'type' not in data[jugador]:
            data[jugador]['type'] = "jugada"
        return data[jugador]

    def armar_posteo(self, client, mensaje):
        orador = self.nombres[client]
        posteo = {"type": "mensaje", "nombre": orador, "mensaje": mensaje}
        # print({self.nombres[user]: posteo for user in USERS
        #         if user != client})
        return {self.nombres[user]: posteo for user in self.USERS
                if user != client}

    def notify_state(self):
        user_state = (self.state_event(user) for user in self.USERS
                      if user in self.nombres)
        [queue.append(state) for state, queue in zip(user_state, self.USERS.values())
        if state]

    def notify_users(self, mensaje):
        [queue.append(self.users_event(mensaje)) for user, queue in self.USERS.items()
                      if user in self.nombres]

    def notify_jugada(self, jugada):
        destinos = ((queue, self.nombres[user]) for user, queue in self.USERS.items()
                    if self.nombres[user] in jugada)
        [queue.append(self.jugada_event(jugada, jugador))
        for queue, jugador in destinos]

    def register(self, client):
        if client in self.nombres:
            del self.nombres[client]
        self.USERS[client] = []
        print(f"[ENGINE SERVER] Client '{client}' registrado")
        return [{"type": "presentacion"}]

    def presentar(self, client, jugador):
        nombre = self.juego.nuevo_jugador(jugador)
        for user in list(self.nombres):
            if self.nombres[user] == nombre:
                del self.nombres[user]
        self.nombres[client] = nombre
        print(f"Se agregó a {self.nombres[client]} (client '{client}')")
        self.notify_state()

    def unregister(self, client):
        del self.USERS[client]
        mensaje = f"Se perdió conexión de {self.nombres[client]}"
        if client in self.nombres:
            del self.nombres[client]
        print(mensaje)
        self.notify_users(mensaje)

    def retirar(self, jugador):
        client, = [user for user in self.USERS if self.nombres[user] == jugador]
        del self.nombres[client]
        del self.USERS[client]
        self.juego.sacar_jugador(jugador)
        print(f"Se eliminó a {jugador}")
        self.notify_state()

    def __call__(self, client, data):
        if data['action'] != "poll":
            print("[ENGINE SERVER]", data)
            clients = '\n\t\t'.join(list(self.USERS))
            print(f"Clients registrados {clients}")
        try:
            if client == "clavesecreta" and data['server'] == "reset":
                self.USERS = {}
                self.nombres = {}
                self.juego = UNO()

            # Maniobras de registro
            if client not in self.USERS:
                print(f"[ENGINE SERVER] Registrando client '{client}'")
                return self.register(client)

            elif data.get("action", "") == "presentacion":
                self.presentar(client, data['nombre'])

            elif client not in self.nombres:
                print(f"[ENGINE SERVER] Pidiendo a '{client}' que registre jugador")
                return self.register(client)

            # Maniobras de desarrollo
            if data["action"] == "estado":
                return [self.state_event(client)]

            if data["action"] == "retirar":
                self.retirar(data['nombre'])
                return [{"type": "desconectar"}]

            elif data["action"] == "mensaje":
                self.notify_jugada(self.armar_posteo(client, data["mensaje"]))

            elif data["action"] == "jugada":
                jugada = self.juego.jugada(self.nombres[client], data["data"])
                if jugada:
                    self.notify_jugada(jugada)

            elif data["action"] == "poll":
                # El cliente solo pide q se le manden las
                # instrucciones en cola. Esto pasa solo.
                pass

            else:
                logging.error(f"unsupported event: {data}" )

            send_this = self.USERS[client][:]
            self.USERS[client] = []
        except Exception as e:
            print_exc()
            send_this = [{"type": "error", "message": f"[ENGINE ERROR] {e}"}]
        return send_this

if __name__ == "__main__":
    import json

    client = "dummy"

    inp = True
    while inp:
        print("Ingresa mensaje al engine:")
        inp = json.loads(input())

        print(f" > {counter(client, inp)}\n")

