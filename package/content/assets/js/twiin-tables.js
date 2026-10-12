// Puts every top-level table of the page content in a container that scrolls horizontally, so a
// wide table (profile tree, constraints, bindings) does not make the page wider than the screen.
// Tables inside another table are left alone; the outer table's container scrolls them.
(function () {
  var content = document.getElementById("segment-content");
  if (!content) return;
  var tables = content.querySelectorAll("table");
  for (var i = 0; i < tables.length; i++) {
    var table = tables[i];
    var parent = table.parentNode;
    if (parent.closest && parent.closest("table")) continue;
    if (parent.classList && parent.classList.contains("twiin-table-scroll")) continue;
    var wrapper = document.createElement("div");
    wrapper.className = "twiin-table-scroll";
    parent.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  }
})();
