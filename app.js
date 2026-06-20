(function () {
  const tasks = Array.isArray(window.MANILADDER_TASKS) ? window.MANILADDER_TASKS : [];
  const videoStatus = window.MANILADDER_VIDEO_STATUS || {};
  const state = {
    query: "",
    level: "all",
    domain: "all",
  };

  const labels = {
    rigid_body: "Rigid Body",
    deformable: "Deformable",
    ultimate_task: "Ultimate",
    single_arm_gripper: "Single Arm Gripper",
    single_arm_dex: "Single Arm Dex",
    dual_arm_gripper: "Dual Arm Gripper",
    dual_arm_dex: "Dual Arm Dex",
    ultimate: "Ultimate",
  };

  const gallery = document.getElementById("gallery");
  const emptyResults = document.getElementById("empty-results");
  const searchInput = document.getElementById("search-input");
  const levelFilter = document.getElementById("level-filter");
  const domainFilter = document.getElementById("domain-filter");
  const introVideo = document.querySelector(".intro-video");
  const introShell = document.querySelector(".intro-video-shell");

  if (introVideo && introShell) {
    introVideo.addEventListener("loadedmetadata", () => {
      introShell.classList.add("has-intro");
    });
    introVideo.addEventListener("error", () => {
      introShell.classList.remove("has-intro");
    });
  }

  function normalize(text) {
    return String(text || "").toLowerCase();
  }

  function labelFor(value) {
    return labels[value] || String(value || "Unknown").replace(/_/g, " ");
  }

  function levelLabel(level) {
    return level === 5 ? "Ultimate" : `Level ${level}`;
  }

  function statusFor(task) {
    const status = videoStatus[task.env_id];
    if (status && status.success) {
      return { label: "Video", className: "status-success", path: status.video || `videos/tasks/${task.env_id}.mp4` };
    }
    if (status && status.status === "skipped") {
      return { label: "Empty", className: "status-empty", path: "" };
    }
    return { label: "Pending", className: "status-pending", path: "" };
  }

  function makeButton(label, value, active, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(active));
    button.addEventListener("click", () => onClick(value));
    return button;
  }

  function renderFilters() {
    const levels = Array.from(new Set(tasks.map((task) => task.level))).sort((a, b) => a - b);
    const domains = Array.from(new Set(tasks.map((task) => task.domain))).sort();

    levelFilter.replaceChildren(
      makeButton("All Levels", "all", state.level === "all", (value) => {
        state.level = value;
        render();
      }),
      ...levels.map((level) => makeButton(levelLabel(level), String(level), state.level === String(level), (value) => {
        state.level = value;
        render();
      })),
    );

    domainFilter.replaceChildren(
      makeButton("All", "all", state.domain === "all", (value) => {
        state.domain = value;
        render();
      }),
      ...domains.map((domain) => makeButton(labelFor(domain), domain, state.domain === domain, (value) => {
        state.domain = value;
        render();
      })),
    );
  }

  function filteredTasks() {
    const query = normalize(state.query);
    return tasks.filter((task) => {
      if (state.level !== "all" && String(task.level) !== state.level) {
        return false;
      }
      if (state.domain !== "all" && task.domain !== state.domain) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = normalize([
        task.env_id,
        task.display_name,
        task.domain,
        task.embodiment,
        task.path,
      ].join(" "));
      return haystack.includes(query);
    });
  }

  function groupTasks(items) {
    const levels = new Map();
    for (const task of items) {
      if (!levels.has(task.level)) {
        levels.set(task.level, new Map());
      }
      const typeKey = `${task.domain}|${task.embodiment}`;
      const typeMap = levels.get(task.level);
      if (!typeMap.has(typeKey)) {
        typeMap.set(typeKey, []);
      }
      typeMap.get(typeKey).push(task);
    }
    return Array.from(levels.entries()).sort((a, b) => a[0] - b[0]);
  }

  function renderTask(task) {
    const card = document.createElement("article");
    card.className = "task-card";

    const media = document.createElement("div");
    media.className = "task-media";
    const status = statusFor(task);
    if (status.path) {
      const video = document.createElement("video");
      video.controls = true;
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.src = status.path;
      video.addEventListener("error", () => {
        media.replaceChildren(missingVideo("Empty"));
      }, { once: true });
      media.append(video);
    } else {
      media.append(missingVideo(status.label));
    }

    const body = document.createElement("div");
    body.className = "task-body";

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.display_name || task.env_id;

    const env = document.createElement("p");
    env.className = "task-env";
    env.textContent = task.env_id;

    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.append(metaChip(levelLabel(task.level)));
    meta.append(metaChip(labelFor(task.embodiment)));
    meta.append(metaChip(status.label, status.className));

    body.append(title, env, meta);
    card.append(media, body);
    return card;
  }

  function missingVideo(label) {
    const div = document.createElement("div");
    div.className = "missing-video";
    div.textContent = label === "Pending" ? "Video pending" : "Empty video slot";
    return div;
  }

  function metaChip(text, className) {
    const span = document.createElement("span");
    span.textContent = text;
    if (className) {
      span.classList.add(className);
    }
    return span;
  }

  function render() {
    renderFilters();
    const items = filteredTasks();
    const grouped = groupTasks(items);
    const fragments = [];

    for (const [level, typeGroups] of grouped) {
      const levelBlock = document.createElement("section");
      levelBlock.className = "level-block";

      const levelHeading = document.createElement("div");
      levelHeading.className = "level-heading";
      const title = document.createElement("h2");
      title.textContent = levelLabel(level);
      const count = document.createElement("span");
      count.className = "level-count";
      const levelTotal = Array.from(typeGroups.values()).reduce((total, group) => total + group.length, 0);
      count.textContent = `${levelTotal} tasks`;
      levelHeading.append(title, count);
      levelBlock.append(levelHeading);

      const orderedGroups = Array.from(typeGroups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      for (const [typeKey, group] of orderedGroups) {
        const [domain, embodiment] = typeKey.split("|");
        const typeGroup = document.createElement("section");
        typeGroup.className = "type-group";

        const typeHeading = document.createElement("h3");
        typeHeading.className = "type-heading";
        const pill = document.createElement("span");
        pill.className = `domain-pill domain-${domain}`;
        pill.textContent = labelFor(domain);
        typeHeading.append(pill, document.createTextNode(labelFor(embodiment)));

        const grid = document.createElement("div");
        grid.className = "task-grid";
        group.sort((a, b) => a.env_id.localeCompare(b.env_id)).forEach((task) => grid.append(renderTask(task)));

        typeGroup.append(typeHeading, grid);
        levelBlock.append(typeGroup);
      }

      fragments.push(levelBlock);
    }

    gallery.replaceChildren(...fragments);
    emptyResults.hidden = items.length > 0;
    updateStats();
  }

  function updateStats() {
    const levels = new Set(tasks.map((task) => task.level));
    const videos = Object.values(videoStatus).filter((status) => status && status.success).length;
    document.getElementById("task-count").textContent = String(tasks.length);
    document.getElementById("level-count").textContent = String(levels.size);
    document.getElementById("video-count").textContent = String(videos);
  }

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });

  render();
})();
