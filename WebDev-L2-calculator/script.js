const hero = document.querySelector(".hero");

const heroContent = document.querySelector(".hero-content");

const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);

hero.addEventListener("mousemove", function (event) {

    if (reducedMotion.matches) {
        return;
    }

    const rect = hero.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (centerY - y) / 40;
    const rotateY = (x - centerX) / 40;

    heroContent.style.transform =
        `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

});

hero.addEventListener("mouseleave", function () {

    heroContent.style.transform =
        "rotateX(0deg) rotateY(0deg)";

});