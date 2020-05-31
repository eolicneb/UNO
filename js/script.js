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

let $carta;
let $dorso;
let mazo = [4, 2, 0];
let pozo = 40;

function al_mazo($carta) {
    mazo.push($carta.find(".simbolo").text());
    pila = mazo.length;
    console.log(`mazo: ${mazo}`)

    const top_mazo = $("#mazo").offset().top;
    const bottom_mazo = $("#mazo").offset().bottom;
    $("#mazo").append("<div class='mazo-offset'/>").children().last()
        .append("<div class='mazo-container'/>").children().last()
        .append($carta)
        .css("top", `${-pila*2}px`);

    $carta.hover(function() {
        $(this).css("top", "-5px");
    }, function() {
        $(this).css("top", "0px");
    })
}

function descartar(num) {
    let $carta = $($(`#yo .carta-container:nth-child(${num}) .carta`));
    $carta.parent().remove();
    al_mazo($carta);
}

function $hacer_carta(num) {
    let $nueva = $carta.clone();
    $nueva.find(".simbolo").text(num);
    $nueva.find(".dibujo > img")
        .attr("src", `data/cartas/${CARTAS_IMG[num]}.png`);
    return $nueva;
}

$(".carta").hover(function() {
    $(this).css("top", "5px");
}, function() {
    $(this).css("top", "0px");
})

function size_yo() {
    let $yo = $("#yo");
    const n = $yo.children().length;
    $yo.css("height", `${n*100}`)
}

$(document).ready(function() {
    console.log("js loaded...")

    $carta = $(".carta").remove();
    $dorso = $(".dorso").remove();

    let hand = [0, 1, 2, 3]; //, 4, 5, 6, 5, 4, 6, 2, 1, 0];

    for (const ord in hand) {
        let $esta_carta = $hacer_carta(hand[ord])
            .appendTo("<div class='carta-container'></div>")
            .parent().appendTo("#yo");
    }

    for (const ord in hand.slice(0, 3)) {
        $dorso.clone()
            .css({"width": "50px", "height": "70px"})
            .appendTo("#otro")
            .find(".simbolo").text(ord);
    }

    $dorso.clone()
        .appendTo("#pozo")
        .css({"width": "70px", "height": "98px"});


    mazo.forEach(function(num) {
        al_mazo($hacer_carta(num));
    });
    // al_mazo($hacer_carta(0));
    // al_mazo($hacer_carta(2));
    // al_mazo($hacer_carta(3));
    descartar(6);

    $(".carta, .dorso").hover(function() {
        $(this).css("top", "-5px");
    }, function() {
        $(this).css("top", "0px");
    })

});