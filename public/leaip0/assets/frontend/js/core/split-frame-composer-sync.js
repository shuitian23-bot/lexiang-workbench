(function () {
  function syncComposer(composer) {
    var textarea = composer.querySelector("textarea");
    var send = composer.querySelector(".send-btn");
    if (!textarea || !send) return;

    send.style.setProperty("transform", "none", "important");
    send.style.setProperty("scale", "1", "important");
    send.style.setProperty("transition", "opacity .2s ease", "important");
    var sendIcon = send.querySelector(".icon");
    if (sendIcon) {
      sendIcon.style.setProperty("transform", "none", "important");
      sendIcon.style.setProperty("scale", "1", "important");
      sendIcon.style.setProperty("transition", "opacity .2s ease", "important");
    }

    function update() {
      send.disabled = !textarea.value.trim();
      textarea.style.height = "auto";
      var contentHeight = textarea.scrollHeight;
      textarea.style.height = Math.min(Math.max(contentHeight, 21), 90) + "px";
      textarea.style.overflowY = contentHeight > 90 ? "auto" : "hidden";
    }

    textarea.addEventListener("input", update);
    update();
  }

  function syncMoreArrow(wrap) {
    var button = wrap.querySelector(":scope > .shortcut");
    var arrow = button && button.querySelector(".icon");
    if (!button || !arrow) return;

    arrow.style.setProperty("transition", "transform .2s ease", "important");
    arrow.style.setProperty("transform-origin", "50% 50%", "important");

    function setExpanded(expanded) {
      wrap.classList.toggle("sync-arrow-open", expanded);
      arrow.style.setProperty("transform", expanded ? "rotate(180deg)" : "rotate(0deg)", "important");
    }

    wrap.addEventListener("mouseenter", function () { setExpanded(true); });
    wrap.addEventListener("mouseleave", function () {
      setExpanded(wrap.classList.contains("open") || button.getAttribute("aria-expanded") === "true");
    });
    wrap.addEventListener("focusin", function () { setExpanded(true); });
    wrap.addEventListener("focusout", function (event) {
      if (!wrap.contains(event.relatedTarget)) setExpanded(wrap.classList.contains("open") || button.getAttribute("aria-expanded") === "true");
    });
    button.addEventListener("click", function () {
      setTimeout(function () {
        setExpanded(wrap.classList.contains("open") || button.getAttribute("aria-expanded") === "true");
      }, 0);
    });
    setExpanded(false);
  }

  document.querySelectorAll(".assistant-bottom .composer").forEach(syncComposer);
  document.querySelectorAll(".assistant-bottom .more-wrap").forEach(syncMoreArrow);
})();
