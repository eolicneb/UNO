const SOCKET_PORT = "6789"

websocket = new WebSocket(`ws://127.0.0.1:${SOCKET_PORT}/`);

// OPERACIONES DE PREGUNTA

function pedir_mazo(num_carta) {
    websocket.send(JSON.stringify({action: "jugada",
                                   data: {jugada: "pedir_mazo"}}));
}

function pedir_pozo() {
    websocket.send(JSON.stringify({action: "jugada",
                                   data: {jugada: "pedir_pozo"}}));
}

function descartar_al_pozo(num_carta) {
    console.log(`Avisando al server. Se descarta ${num_carta}.`)
    if (num_carta) {
        websocket.send(JSON.stringify({action: "jugada",
                                       data: {jugada: "descartar",
                                              carta: num_carta}}));
    }
}

function mandar_nombre() {
    let nombre = (new URL(location.href)).searchParams.get('nombre')
    console.log("Registrandose con nombre", nombre);
    websocket.send(JSON.stringify({action: "presentacion", nombre: nombre}));
}

websocket.onmessage = function(event) {
    data = JSON.parse(event.data);
    console.log(`[WEBSOCEKT] ${event.data}`)
    switch (data.type) {
        case 'presentacion':
            mandar_nombre();
            break;
        case 'jugada':
            switch (data.jugada) {
                case 'ganaste':
                    gane();
                    break;
                case 'otro_gano':
                    otro_gano(data.quien, data.carta)
                    break;
                case 'recibis_del_mazo':
                    recibir_del_mazo(data.carta);
                    break;
                case 'recibis_del_pozo':
                    recibir_del_pozo(data.carta);
                    break;
                case 'tiraron_al_pozo':
                    tirar_al_pozo(data.carta, data.quien);
                    break;
                case 'otro_levanto_del_mazo':
                    otro_levanto_del_mazo(data.quien);
                    break;
                case 'otro_levanto_del_pozo':
                    otro_levanto_del_pozo(data.quien)
                    break;
                default:
                    console.error("Jugada no conocida", data.jugada)
            }
            break;
        case 'estado':
            validar(data.estado);
            break;
        case 'jugadores':
            nombrar(data.nombre, data.otros);
            break;
        case 'error':
            console.log("Jugada incorrecta", data.error)
            validar(data.estado);
            break;
        default:
            console.error("Mensaje raro del websocket", data);
    }
}

// OPERACIONES DE RESPUESTA

function gane() {
    $("#footer").text("GANE!")
}

function validar(estado) {
    console.log("Estado", estado);
    $("#nombre").text(estado.nombre);
    if (estado.mazo != $("#mazo").children.length) {
        armar_mazo(estado.mazo);
    }
    armar_mano(estado.mano);
    armar_otros(estado.otros);
    armar_pozo(estado.pozo);
}

function nombrar(yo, otros) {
    console.log("Yo", yo, "\notros", otros);
}

function recibir_del_mazo(num_carta) {
    console.log("recibi", num_carta);
    a_la_mano($del_mazo(num_carta));
}

function recibir_del_pozo(num_carta) {
    console.log("Dicen que levante", num_carta);
    en_mano = $("#yo .simbolo").toArray().map(function(esta, $e) {
        return esta || num_carta == $($e).text();
    }, false)
    if (!en_mano) {
        console.error(`La carta ${num_carta} no es la q levante!`);
    }
}

function otro_levanto_del_pozo(quien) {
    $("#pozo .carta-offset").last().remove();
    $("#pozo .carta").last().draggable("enable");
    a_otro(quien);
}

function otro_levanto_del_mazo(quien) {
    console.log(quien, "levanto del mazo");
    $del_mazo();
    a_otro(quien);
}

function tirar_al_pozo(carta, quien) {
    quien && de_otro(quien);
    quien && $("#footer").text(`${quien} tiro esa carta`);
    al_pozo($hacer_carta(carta));
}

function otro_gano(quien, carta) {
    tirar_al_pozo(quien, carta);
    $("#footer").text(`${quien} GANO!`);
}

const CARTAS_IMG = {
    0: "0_rojo",
    1: "saltea_rojo",
    2: "1_amarillo",
    3: "1_azul",
    4: "1_rojo",
    5: "1_verde",
    6: "mas2_amarillo",
}

const carta_css = {
    "mazo": {
        "with": "100%",
        "height": "100%",
        "position": "absolute",
        "top": "auto",
        "bottom": "auto",
        "left": "auto",
        "right": "auto"
    },
    "mano": {
        "with": "100%",
        "height": "100%",
        "position": "absolute",
        "top": "auto",
        "bottom": "auto",
        "left": "auto",
        "right": "auto"
    }
}

let $carta;
let $dorso;

let pozo = [];
let mano = [];
let otro = [];

let bigZ = 100;
let prev_z = 0;

// OPERACIONES DEL TABLERO

function armar_mazo(mazo) {
    console.log("armando el mazo:", mazo)
    $("#mazo").children().remove();
    for (let i=0; i<mazo; i++) {
        let $carta = $dorso.clone().data("estado", "mazo").draggable({
            start: function(event, ui) {
                prev_z = $(this).css("z-index");
                $(this).css("z-index", bigZ);
            },
            stop: function(event, ui) {
                $(this).css("z-index", prev_z);
            }
        });
        $("#mazo").append("<div class='carta-offset'/>").children().last()
            .append($carta).css({"top": `${-i*1}px`})
        $carta.css({"width": "70px", "height": "98px"});
        $carta.draggable("disable");
    }
    $(".dorso").hover(function() {
        $(this).css("top", "-5px");
    }, function() {
        $(this).css("top", "0px");
    })
    $("#mazo .dorso").last().draggable("enable");
}

function armar_mano(mano) {
    console.log("Armando mano", mano)
    $("#yo").children().remove();
    mano.forEach((e) => {
        a_la_mano($hacer_carta(e));
    });
}

function armar_otros(otros) {
    $("#otro_container").children().remove();
    Object.entries(otros).forEach(function(kv) {
        otro = kv[0]; cantidad = kv[1];
        console.log(`Al otro ${otro} le tocan ${cantidad}`);
        $otro = $("<div/>").appendTo("#otro_container");
        $otro.prop("id", `${otro}`).append("<div class='dialogo'/>")
        $otro.find(".dialogo").text(otro);
        $("<div class='otro'/>").appendTo($otro);
        for (let i=0; i<cantidad; i++) { a_otro(otro); }
    });
}

function armar_pozo(pozo) {
    $("#pozo").children().remove();
    pozo.forEach(tirar_al_pozo);
}

function al_pozo($carta) {
    $carta.data("estado", "pozo");

    pozo.push($carta.find(".simbolo").text());
    $("#pozo .carta").last().draggable("disable");

    pila = pozo.length;
    $("#pozo").append("<div class='carta-offset'/>").children().last()
        .append("<div class='pozo-container'/>").children().last()
        .append($carta)
        .css("top", `${-pila*2}px`);
    $carta.removeAttr("style").css(carta_css.mazo);
}

function a_otro(otro) {
    otro = otro || "otro";
    $(`#${otro} > .otro`).append("<div class='carta-offset'/>").children().last()
        .append("<div class='otro-container'/>").children()
        .append($dorso.clone().attr("style", ""));
}

function de_otro(otro) {
    otro = otro || "otro";
    $(`#${otro} .carta-offset`).last().remove();
}

function descartarse($carta, append_function) {
    if (!$carta) {return false;}
    discard = $carta.parents("#yo").find(".carta").index($carta)
    console.log("descartar", discard);
    mano = mano.filter((e, i) => {return i != discard;});
    $parent = $carta.parents(".carta-offset");
    append_function($carta);
    $parent.remove();
}

function $del_mazo(num_carta) {
    $dorso = $("#mazo .dorso").last();
    $dorso.parents(".carta-offset").remove();
    $("#mazo .dorso").last().draggable("enable");

    if (num_carta !== undefined) {
        return $hacer_carta(num_carta);
    }
}

function del_pozo($carta, append_function) {
    $parent = $carta.parents(".carta-offset");
    append_function($carta);
    $parent.remove();
    $("#pozo .carta").last().draggable("enable");
    return true;
}

function a_la_mano($carta) {
    mano.push($carta.find(".simbolo").text());
    $carta.data("estado", "mano")
        .appendTo("<div class='carta-container'></div>")
        .parent().appendTo("<div class='carta-offset'></div>")
        .parent().appendTo("#yo");
    $carta.removeAttr("style").css(carta_css.mano);
}

function $hacer_carta(num) {
    let $nueva = $carta.clone();
    $nueva.find(".simbolo").text(num);
    $nueva.find(".dibujo > img")
        .attr("src", `data/cartas/${CARTAS_IMG[num]}.png`);
    $nueva.css("postion", "absolute");
    $nueva.hover(function() {
        $(this).css("top", "-5px");
    }, function() {
        $(this).css("top", "0px");
    })
    $nueva.draggable({
        revert : function(event, ui) {
            $(this).data("ui-draggable").originalPosition = {
                top : 0,
                left : 0
            };
            // return boolean
            return !event;
        },
        start: function(event, ui) {
            prev_z = $(this).css("z-index");
            $(this).css("z-index", bigZ);
        },
        stop: function(event, ui) {
            $(this).css("z-index", prev_z);
        },
    });
    return $nueva;
}

$(document).ready(function() {
    console.log("js loaded...")

    $carta = $(".carta").remove();
    $dorso = $(".dorso").remove();

    $("#mesa_container").droppable({
        drop: function(event, ui) {
            let origen = ui.draggable.data("estado");
            if (origen == "pozo") {
                ui.draggable.css({"top": 0, "left": 0});
            } else if (origen == "mano") {
                descartarse(ui.draggable, al_pozo);
                descartar_al_pozo(ui.draggable.find(".simbolo").text());
            }
            $(this).css("border", "none");
        },
        over: function(event, ui) {
            $(this).css("border", "solid red");
        },
        out: function(event, ui) {
            $(this).css("border", "none");
        }
    });

    $("#yo_container").droppable({
        drop: function(event, ui) {
            let origen = ui.draggable.data("estado");
            if (origen == "mano") {
                ui.draggable.css({"top": 0, "left": 0});
            } else {
                if (origen == "pozo") {
                    const result = del_pozo(ui.draggable, a_la_mano);
                    // AVISO A WEBSOCKET SE SACO UNA CARTA DEL POZO
                    if (result) { pedir_pozo(ui.draggable.find(".simbolo").text()) }
                    console.log("movido", result)
                } else if (origen == "mazo") {
                    // a_la_mano($del_mazo(ui.draggable));
                    // LLAMAR A WEBSOCKET PIDIENDO UNA CARTA DEL MAZO
                    pedir_mazo();
                }
            }
            $(this).css("border", "none");
        },
        over: function(event, ui) {
            $(this).css("border", "solid red");
        },
        out: function(event, ui) {
            $(this).css("border", "none");
        }
    });

    websocket.send(JSON.stringify({"action": "estado"}))

});