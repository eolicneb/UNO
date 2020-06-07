from random import shuffle, randint


class UNO:
    def __init__(self, total=56, primera_mano=5):
        self.total = total
        self._contador_de_nombres = 1
        self.primera_mano = primera_mano
        self.manos = {}
        self.pozo = []
        self.mazo = []
        # mezclar inicializa el mazo
        self._mezclar()

    def _mezclar(self):
        self.mazo = list(range(self.total))
        shuffle(self.mazo)

    def nuevo_jugador(self, jugador=None):
        if not jugador:
            jugador = f"mono-{self._contador_de_nombres}"
            self._contador_de_nombres += 1
        if not jugador in self.manos:
            self.manos[jugador] = []
            for _ in range(self.primera_mano):
                if not self.mazo:
                    break
                self.manos[jugador].append(self.mazo.pop())
        return jugador

    def sacar_jugador(self, jugador):
        self.mazo.extend(self.manos[jugador][:])
        shuffle(self.mazo)
        del self.manos[jugador]

    def estado(self, jugador):
        if jugador not in self.manos:
            return {}
        otros = {u: len(m) for u, m in self.manos.items() if u != jugador}
        su_estado = {'mazo': len(self.mazo),
                     'pozo': self.pozo,
                     'nombre': jugador,
                     'mano': self.manos[jugador],
                     'otros': otros}
        return su_estado

    def jugada(self, jugador, data):
        if data['jugada'] == "pedir_mazo":
            return self._pedir_mazo(jugador, data)

        elif data['jugada'] == "pedir_pozo":
            return self._pedir_pozo(jugador, data)

        elif data['jugada'] == "descartar":
            return self._descartar(jugador, data)

        elif data['jugada'] == "reset":
            return self._reset()

    def _pedir_mazo(self, jugador, data):
            if not self.mazo:
                return {jugador: {'type': "error",
                                  'error': "El mazo está vacio"}}

            carta = self.mazo.pop()
            self.manos[jugador].append(carta)

            msj_otros = {'jugada': 'otro_levanto_del_mazo',
                         'quien': jugador}
            resultado = {otro: msj_otros for otro in self.manos
                         if otro != jugador}
            resultado[jugador] = {'jugada': 'recibis_del_mazo',
                                  'carta': carta}
            return resultado

    def _pedir_pozo(self, jugador, data):
            if not self.pozo:
                return {jugador: {'type': "error",
                                  'error': "El pozo está vacio"}}
            carta = self.pozo.pop()
            self.manos[jugador].append(carta)

            msj_otros = {'jugada': "otro_levanto_del_pozo",
                         'quien': jugador}
            resultado = {otro: msj_otros for otro in self.manos
                         if otro != jugador}

            resultado[jugador] = {'jugada': 'recibis_del_pozo',
                                  'carta': carta}
            return resultado

    def _descartar(self, jugador, data):
            carta = int(data['carta'])
            if carta not in self.manos[jugador]:
                # ERROR: esa carta no esta en la mano del jugador
                return {jugador: {'type': "error",
                                  'error': f"No tenes la carta {carta}.\nTu mano es {self.manos[jugador]}"}}

            self.pozo.append(carta)
            self.manos[jugador].remove(carta)
            msj_otros = {'jugada': "tiraron_al_pozo",
                         'quien': jugador,
                         'carta': carta}
            resultado = {otro: msj_otros for otro in self.manos
                         if otro != jugador}

            if not self.manos[jugador]:
                # jugador GANO!
                msj_otros['jugada'] = "otro_gano"
                resultado[jugador] = {'jugada': "ganaste"}

            return resultado

    def _reset(self):
        self.pozo = []
        self._mezclar()
        resultado = {}
        self.manos = {jugador: [self.mazo.pop() for _ in range(self.primera_mano)]
                      for jugador in self.manos}
        return {jugador: {"type": "estado",
                          "estado": self.estado(jugador)} for jugador in self.manos}
