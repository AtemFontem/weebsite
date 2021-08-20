window.addEventListener("DOMContentLoaded", (event) => {
  // adapted from https://codepen.io/lasjorg/pen/GRKreyJ
  const button = document.querySelector("#play-pause");
  const audio = document.querySelector("audio");

  button.addEventListener("click", () => {
    if (audio.paused) {
      audio.volume = 0.4;
      audio.play();
    } else {
      audio.pause();
    }
    button.classList.add("fade");
  });
});
