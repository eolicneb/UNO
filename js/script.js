const url = new URL(location.href)

const HOST = "localhost";
const PORT = "5000";
// const url = `http://${HOST}:${PORT}/`;

console.log("Armando engine");
let engine = function() {
    const base_url = url.origin;
    const engine_url = `${base_url}/engine`;

    // periodo de refresh para hacer polling al engine
    const check_period = 500;

    let log_id = null;
    let logged = false;
    let logging = false;

    let loggeame = function(callback, params) {
        if (logged) {
            console.warn("Se intentó volver a loggear");
            callback(params);
        } else if (!logging) {
            logging = true;
            $.ajax({
                url: `${base_url}/logging`,
                type: 'GET',
                success: function(resp) {
                    logging = false;
                    if (logged == true) {
                        console.warn("Se loggeó más de una vez");
                    } else {
                        log_id = resp.log_id;
                        logged = true;
                        console.log("Loggeado con id", log_id, resp);
                        do_periodic_check = true;
                        $("#entrar").text("RETIRARSE");
                    }
                    callback(params);
                },
                error: function(err) {
                    logging = false;
                    console.error("Logging error:", err);
                }
            })
        }
    }
    // loggeame();

    function send(data) {
        data.log_id = log_id;
        if (logged == false) {
            loggeame(this.send, data);
        } else {
            $.ajax({
                url: engine_url,
                type: 'POST',
                data: JSON.stringify(data),
                // dataType: 'json',
                beforeSend: function() {
                    if (data.action != "poll") {
                        console.log('Sending', data, 'to url', engine_url);
                        return true;
                    }
                },
                success: function(resp) {
                    if (resp.mensaje && resp.mensaje.length) {
                        console.log("ajax", resp);
                        resp.mensaje.forEach(function(msg) { onmessage(msg); });
                    }
                },
                error: console.error
            });
        }
    }

    // polling periodico
    let do_periodic_check = false;
    function request() {
        if (do_periodic_check === true) {
            send({action: "poll", data: {}});
        }
    }
    setInterval(request, check_period);
    function start_polling() { do_periodic_check = true; }

    return {
        nombre: "",
        log_id: log_id,
        url: engine_url,
        send: send,
        start_polling: start_polling,
        is_logged: function() { return logged; },
        desconectar: function() {
            logged = false;
            do_periodic_check = false;
            $("#entrar").text("ENTRAR");
        }
    }
}(); // new engine(`ws://${HOST}:${PORT}/`);

console.log("Engine url", engine.url);
// OPERACIONES DE PREGUNTA

function pedir_mazo() {
    engine.send({action: "jugada", data: {jugada: "pedir_mazo"}});
}

function pedir_pozo(num_carta) {
    engine.send({action: "jugada", data: {jugada: "pedir_pozo"}});
}

function descartar_al_pozo(num_carta) {
    console.log(`Avisando al server. Se descarta ${num_carta}.`)
    if (num_carta) {
        engine.send({action: "jugada", data: {jugada: "descartar",
                                              carta: num_carta}});
    }
}

function mandar_nombre(nombre) {
    if (engine.is_logged() === true) {
        nombre = nombre || url.searchParams.get('nombre')
        console.log("Registrandose con nombre", nombre);
        engine.send({action: "presentacion", nombre: nombre});
    }
}

onmessage = function(data) {
    // data = JSON.parse(event.data);
    console.log(`[ENGINE] ${data}`)
    switch (data.type) {
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
        case 'presentacion':
            mandar_nombre();
            break;
        case 'estado':
            validar(data.estado);
            engine.start_polling();
            break;
        case 'jugadores':
            nombrar(data.nombre, data.otros);
            break;
        case 'mensaje':
            mensaje(data.nombre, data.mensaje);
            break;
        case 'desconectar':
            console.log("Desconectando...")
            engine.desconectar();
            break;
        case 'error':
            console.log("Jugada incorrecta", data.error)
            validar(data.estado);
            break;
        default:
            console.error("Mensaje raro del engine", data);
    }
}

// OPERACIONES DE RESPUESTA

function gane() {
    $("#footer").text("GANE!")
}

function validar(estado) {
    console.log("Estado", estado);
    engine.nombre = estado.nombre;
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
    tirar_al_pozo(carta, quien);
    $("#footer").text(`${quien} GANO!`);
}

function mensaje(jugador, mensaje) {
    $("#mensajes").text(`(( ${jugador} ))-> ${mensaje}`);
}

const CARTAS_IMG = {
    0: "0_azul",
    1: "0_rojo",
    2: "0_amarillo",
    3: "0_verde",
    4: "1_azul",
    5: "1_rojo",
    6: "1_amarillo",
    7: "1_verde",
    8: "2_azul",
    9: "2_rojo",
    10: "2_amarillo",
    11: "2_verde",
    12: "3_azul",
    13: "3_rojo",
    14: "3_amarillo",
    15: "3_verde",
    16: "4_azul",
    17: "4_rojo",
    18: "4_amarillo",
    19: "4_verde",
    20: "5_azul",
    21: "5_rojo",
    22: "5_amarillo",
    23: "5_verde",
    24: "6_azul",
    25: "6_rojo",
    26: "6_amarillo",
    27: "6_verde",
    28: "7_azul",
    29: "7_rojo",
    30: "7_amarillo",
    31: "7_verde",
    32: "8_azul",
    33: "8_rojo",
    34: "8_amarillo",
    35: "8_verde",
    36: "9_azul",
    37: "9_rojo",
    38: "9_amarillo",
    39: "9_verde",
    40: "mas2_azul",
    41: "mas2_rojo",
    42: "mas2_amarillo",
    43: "mas2_verde",
    44: "voltea_azul",
    45: "voltea_rojo",
    46: "voltea_amarillo",
    47: "voltea_verde",
    48: "saltea_azul",
    49: "saltea_rojo",
    50: "saltea_amarillo",
    51: "saltea_verde",
    52: "cambio",
    53: "mas4",
    54: "cambio",
    55: "mas4"
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
                    // AVISO A engine SE SACO UNA CARTA DEL POZO
                    if (result) { pedir_pozo(ui.draggable.find(".simbolo").text()) }
                    console.log("movido", result)
                } else if (origen == "mazo") {
                    // a_la_mano($del_mazo(ui.draggable));
                    // LLAMAR A engine PIDIENDO UNA CARTA DEL MAZO
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

});

$("#reset").click(function() {
    engine.send({action: "jugada", data: {jugada: "reset"}})
});

$("#entrar").click(function() {
    console.log("is_logged", engine.is_logged());
    if (engine.is_logged() !== true) {
        console.log("loggeandose");
        engine.send({action: "estado"});
    } else {
        console.log("retirandose");
        engine.send({action: "retirar", nombre: engine.nombre});
    }
});

function mandar_mensaje() {
    let msg = $("#mensaje").val();
    if (msg != "") {
        console.log("mandando mensaje", msg);
        engine.send({action: "mensaje", mensaje: msg});
        $("#mensaje").val("");
    } else {
        console.log("mensaje vacío!");
    }
}

$("#yo_container .hablar").click(mandar_mensaje);

$("#yo_container .hablar").bind("enterKey", mandar_mensaje);