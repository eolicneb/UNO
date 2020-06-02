
var shuffle = function (array) {
    /**
     * Randomly shuffle an array
     * https://stackoverflow.com/a/2450976/1293256
     * @param  {Array} array The array to shuffle
     * @return {Array}       The shuffled array
     */
	var currentIndex = array.length;
	var temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
};

const HAND_ANGLE = 5;
const CARD_RATIO = 1.4;
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
    "pozo": {
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

let pozo = shuffle([4,5,1,0,3,2,0,3,5,0,2,0,1,1,3,5,0,3,0]);
// console.log(pozo.filter(function(e) { return e != 0; }))
let mazo = [];
let mano = [];
let otro = [];

let bigZ = 100;
let prev_z = 0;

function relevar() {
    console.log(`pozo: ${pozo}\nmazo: ${mazo}\nmano: ${mano}\notro: ${otro}`)
}

function al_mazo($carta) {
    $carta.data("estado", "mazo");

    mazo.push($carta.find(".simbolo").text());
    $("#mazo .carta").last().draggable("disable");

    pila = mazo.length;
    $("#mazo").append("<div class='carta-offset'/>").children().last()
        .append("<div class='mazo-container'/>").children().last()
        .append($carta)
        .css("top", `${-pila*2}px`);
    $carta.removeAttr("style").css(carta_css.pozo);
}

function armar_pozo(pozo, $dorso) {
    pozo.forEach(function(sym, i) {
        let $carta = $dorso.clone().data("estado", "pozo").draggable({
            cancel: ".title",
            start: function(event, ui) {
                prev_z = $(this).css("z-index");
                $(this).css("z-index", bigZ);
            },
            stop: function(event, ui) {
                $(this).css("z-index", prev_z);
                relevar();
            }
        });

        $("#pozo").append("<div class='carta-offset'/>").children().last()
            .append($carta).css({"top": `${-i*1}px`})
        $carta.css({"width": "70px", "height": "98px"});
            // .css();
    });
    $(".dorso").hover(function() {
        $(this).css("top", "-5px");
    }, function() {
        $(this).css("top", "0px");
    })
    $("#pozo .dorso").last().draggable("enable");
}

function descartarse($carta, append_function) {
    if (!$carta) {return false;}
    discard = $carta.parents("#yo").find(".carta").index($carta)
    console.log("descartar", discard);
    mano = mano.filter((e, i) => {return i != discard;});
    $parent = $carta.parents(".carta-offset");
    append_function($carta);
    $parent.remove();

    // mano = mano.filter(function(e) { return e != num; });

    // let $carta = $($(`#yo .carta-offset:nth-child(${num}) .carta`));
    // let $parent = $carta.parents(".carta-offset");
    // al_mazo($carta);
    // $parent.remove();
}

console.log("probando", $("body").children().index("#otro"));
console.log("probando", descartarse());

function $del_pozo($dorso) {
    $dorso = $dorso || $("#pozo .dorso").last();
    $dorso.parents(".carta-offset").remove();
    $("#pozo .dorso").last().draggable("enable");

    let levantar = pozo.pop();
    return $hacer_carta(levantar);
}

function del_mazo($carta, append_function) {
    if ($carta.find(".simbolo").text() != mazo[mazo.length-1]) {
        console.log("no es el tope", $carta.find(".simbolo").text(), mazo[mazo.length-1]);
        return false;
    }
    mazo.pop();
    $parent = $carta.parents(".carta-offset");
    append_function($carta);
    $parent.remove();
    $("#mazo .carta").last().draggable("enable");
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
            relevar();
        },
    });
    return $nueva;
}

$(document).ready(function() {
    console.log("js loaded...")

    $carta = $(".carta").remove();
    $dorso = $(".dorso").remove();

    armar_pozo(pozo, $dorso);

    $("#mesa").droppable({
        drop: function(event, ui) {
            let origen = ui.draggable.data("estado");
            if (origen == "mazo") {
                ui.draggable.css({"top": 0, "left": 0});
            } else if (origen == "mano") {
                descartarse(ui.draggable, al_mazo);
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

    $("#yo").droppable({
        drop: function(event, ui) {
            let origen = ui.draggable.data("estado");
            if (origen == "mano") {
                ui.draggable.css({"top": 0, "left": 0});
            } else {
                if (origen == "mazo") {
                    const result = del_mazo(ui.draggable, a_la_mano);
                    console.log("movido", result)
                } else if (origen == "pozo") {
                    a_la_mano($del_pozo(ui.draggable));
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