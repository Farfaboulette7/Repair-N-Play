// Attend que le DOM soit entièrement chargé avant d'exécuter la logique
document.addEventListener("DOMContentLoaded", () => {

  /* ==========================================================================
     1. FONCTIONS UTILITAIRES & ANIMATIONS (GSAP)
     ========================================================================== */

  /**
   * Découpe le texte d'un élément en lettres individuelles entourées de <span>.
   * Utilisé pour préparer le titre à une animation lettre par lettre.
   * @param {HTMLElement} textEl - L'élément HTML contenant le texte.
   */
  function splitText(textEl) {
    if (!textEl || !textEl.textContent) return;
    const text = textEl.textContent.split("");
    textEl.innerHTML = "";
    text.forEach((letter) => {
      const span = document.createElement("span");
      span.textContent = letter;
      span.style.opacity = 0; // Masqué au départ pour l'animation
      textEl.appendChild(span);
    });
  }

  /**
   * Anime l'affichage d'un titre lettre par lettre avec GSAP.
   * @param {HTMLElement} titleEl - L'élément titre (h1, h2, etc.).
   */
  function animateTitle(titleEl) {
    if (!titleEl || typeof gsap === "undefined") return;
    splitText(titleEl);
    const letters = titleEl.querySelectorAll("span");
    letters.forEach((letter, i) => {
      gsap.to(letter, {
        opacity: 1,
        delay: 0.07 * i, // Décalage progressif pour chaque lettre
        duration: 0.05,
      });
    });
  }

  /**
   * Anime l'apparition d'un groupe de boutons (effet de glissement vers la droite + fondu).
   * @param {HTMLElement} container - Le conteneur contenant les boutons.
   */
  function animateButtons(container) {
    if (!container || typeof gsap === "undefined") return;
    const buttons = container.querySelectorAll(".button");

    // État initial : décalés de 35px à gauche et invisibles
    gsap.set(buttons, { x: -35, opacity: 0 });

    // Animation en cascade
    buttons.forEach((button, i) => {
      gsap.to(button, {
        x: 0,
        opacity: 1,
        delay: 0.1 * i, // Décalage en cascade entre chaque bouton
        duration: 0.2,
        ease: "power2.out",
      });
    });
  }

  /* ==========================================================================
     2. GESTION DES TRANSITIONS DE PANNEAUX (Figures)
     ========================================================================== */

  /**
   * Gère l'affichage dynamique et les animations d'entrée/sortie des fiches de détail (<figure>).
   * @param {HTMLElement} figContainer - Le conteneur où injecter la figure.
   * @param {string} htmlContent - Le code HTML de la nouvelle figure.
   */
  function showFavFigure(figContainer, htmlContent) {
    const currentFig = figContainer.querySelector("figure");

    // 1. Si une figure est déjà affichée, on lance d'abord son animation de sortie (.exit)
    if (currentFig) {
      currentFig.classList.remove("active");
      currentFig.classList.add("exit");

      // Attente du temps de transition CSS avant d'injecter la nouvelle figure
      setTimeout(() => {
        figContainer.innerHTML = htmlContent;
        const newFig = figContainer.querySelector("figure");
        if (newFig) {
          setTimeout(() => newFig.classList.add("active"), 50); // Déclenche l'animation d'entrée
        }
      }, 300);
    } else {
      // 2. Première apparition s'il n'y avait rien d'affiché
      figContainer.innerHTML = htmlContent;
      const newFig = figContainer.querySelector("figure");
      if (newFig) {
        setTimeout(() => newFig.classList.add("active"), 50);
      }
    }
  }

  /* ==========================================================================
     3. PARSING DU FICHIER DE FAVORIS EXPORTÉ (.HTML)
     ========================================================================== */

  /**
   * Analyse de manière récursive la structure <DL><DT> d'un fichier HTML de favoris
   * afin d'en extraire un tableau d'objets structurés (dossiers et liens).
   * @param {HTMLElement} element - L'élément balise <DL> courante.
   * @returns {Array} - Tableau de dossiers/liens.
   */
  function parseBookmarksTree(element) {
    const items = [];
    const children = element.children;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      if (child.tagName === "DT") {
        const h3 = child.querySelector(":scope > h3"); // Titre d'un dossier
        const a = child.querySelector(":scope > a");   // Lien d'un favori
        const dl = child.querySelector(":scope > dl"); // Contenu d'un dossier

        if (h3 && dl) {
          // Cas 1 : C'est un dossier (contient un H3 et un sous-DL)
          items.push({
            type: "folder",
            title: h3.textContent.trim(),
            children: parseBookmarksTree(dl), // Appel récursif pour les sous-éléments
          });
        } else if (a) {
          // Cas 2 : C'est un lien
          const url = a.href;
          const title = a.textContent.trim();
          if (title && url.startsWith("http")) {
            items.push({
              type: "link",
              title: title,
              url: url,
            });
          }
        }
      } else if (child.tagName === "DL") {
        // Sécurité si un DL est imbriqué sans DT direct
        items.push(...parseBookmarksTree(child));
      }
    }

    // Simplification : si la racine ne contient qu'un seul dossier racine ("Barre de favoris"), on saute ce niveau
    if (items.length === 1 && items[0].type === "folder" && items[0].children.length > 0) {
      const rootTitle = items[0].title.toLowerCase();
      if (rootTitle.includes("favoris") || rootTitle.includes("bookmarks") || rootTitle.includes("barre")) {
        return items[0].children;
      }
    }

    return items;
  }

  /* ==========================================================================
     4. RECHERCHE ET NAVIGATION DANS LES FAVORIS
     ========================================================================== */

  /**
   * Recherche récursive dans toute l'arborescence des favoris en fonction d'un mot-clé.
   * @param {Array} items - L'arborescence des favoris.
   * @param {string} query - La recherche (en minuscules).
   * @returns {Array} - La liste des favoris correspondants.
   */
  function searchBookmarks(items, query) {
    let results = [];
    items.forEach((item) => {
      if (item.type === "link") {
        // Compare le titre ou l'URL
        if (item.title.toLowerCase().includes(query) || item.url.toLowerCase().includes(query)) {
          results.push(item);
        }
      } else if (item.type === "folder" && item.children) {
        // Continue la recherche dans les sous-dossiers
        results = results.concat(searchBookmarks(item.children, query));
      }
    });
    return results;
  }

  /* --- Variables d'état pour la navigation --- */
  let bookmarksTree = []; // Arborescence complète des favoris
  let folderStack = [];   // Pile de navigation (historique des dossiers ouverts)

  /**
   * Crée un bouton HTML pour un favori (dossier ou lien) et lui associe ses événements.
   */
  function createBookmarkButton(item, container, figContainer) {
    const btn = document.createElement("button");
    btn.className = "button";
    btn.textContent = item.title;
    btn.setAttribute("title", item.title);

    if (item.type === "folder") {
      btn.classList.add("folder-btn");

      // Clic sur un DOSSIER : entrer dans le dossier
      btn.addEventListener("click", () => {
        const searchInput = document.getElementById("fav-search-input");
        if (searchInput) searchInput.value = ""; // Réinitialise la recherche

        // Masque la figure active s'il y en avait une
        const currentFig = figContainer.querySelector("figure");
        if (currentFig) {
          currentFig.classList.remove("active");
          currentFig.classList.add("exit");
          setTimeout(() => { figContainer.innerHTML = ""; }, 500);
        }

        folderStack.push(item); // Ajoute le dossier à la pile de navigation
        renderCurrentFolder();  // Réaffiche la vue
      });

    } else if (item.type === "link") {
      // Clic sur un LIEN : afficher la fiche d'information (<figure>)
      btn.addEventListener("click", () => {
        container.querySelectorAll(".button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Récupération du domaine pour charger la Favicon Google
        const hostname = new URL(item.url).hostname;
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;

        // Construction du HTML du panneau de détail
        const newFigureHTML = `
          <figure>
            <figcaption>${item.title}</figcaption>
            <div>
              <img src="${faviconUrl}" alt="Logo ${item.title}" class="app-logo">
              <hr>
              <p>
                Favori : <strong>${item.title}</strong><br>
                Domaine : ${hostname}
              </p>
              <a class="app-link" href="${item.url}" target="_blank">Ouvrir le lien</a>
            </div>
          </figure>
        `;

        // Affiche la figure avec animation
        showFavFigure(figContainer, newFigureHTML);
      });
    }

    container.appendChild(btn);
  }

  /**
   * Génère et rend visuellement la liste des boutons pour le dossier ou la recherche en cours.
   */
  function renderCurrentFolder() {
    const container = document.getElementById("fav-buttons-container");
    const figContainer = document.querySelector("#tab-fav .fav-figures");
    const searchInput = document.getElementById("fav-search-input");

    if (!container || !figContainer) return;

    container.innerHTML = ""; // Vide le conteneur avant rendu
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    // MOTEUR DE RECHERCHE
    if (query.length > 0) {
      const searchResults = searchBookmarks(bookmarksTree, query);

      if (searchResults.length === 0) {
        const emptyMsg = document.createElement("p");
        emptyMsg.style.paddingLeft = "60px";
        emptyMsg.style.fontStyle = "italic";
        emptyMsg.textContent = "Aucun favori trouvé.";
        container.appendChild(emptyMsg);
        return;
      }

      searchResults.forEach((item) => {
        createBookmarkButton(item, container, figContainer);
      });

    } else {
      // NAVIGATION PAR DOSSIERS
      const currentItems = folderStack.length > 0
          ? folderStack[folderStack.length - 1].children // Éléments du sous-dossier courant
          : bookmarksTree;                              // Racine des favoris

      // Bouton RETOUR (si on est dans un sous-dossier)
      if (folderStack.length > 0) {
        const parentName = folderStack.length > 1
            ? folderStack[folderStack.length - 2].title
            : "Favoris";

        const backBtn = document.createElement("button");
        backBtn.className = "button back-btn";
        backBtn.textContent = `${parentName}`;
        backBtn.title = "Revenir au dossier précédent";

        backBtn.addEventListener("click", () => {
          // Masque la figure lors du retour
          const currentFig = figContainer.querySelector("figure");
          if (currentFig) {
            currentFig.classList.remove("active");
            currentFig.classList.add("exit");
            setTimeout(() => { figContainer.innerHTML = ""; }, 500);
          }

          folderStack.pop();    // Retire le dernier dossier de la pile
          renderCurrentFolder(); // Rendu du dossier parent
        });

        container.appendChild(backBtn);
      }

      // Rendu de tous les favoris du niveau actuel
      currentItems.forEach((item) => {
        createBookmarkButton(item, container, figContainer);
      });
    }

    // Déclenche l'animation d'apparition des nouveaux boutons générés
    animateButtons(container);
  }

  /* ==========================================================================
     5. INITIALISATION DU CHAMP DE RECHERCHE
     ========================================================================== */
  function setupSearchInput() {
    const searchInput = document.getElementById("fav-search-input");
    if (!searchInput) return;

    // Écoute chaque frappe dans le champ de recherche
    searchInput.addEventListener("input", () => {
      renderCurrentFolder();
    });
  }

  /* ==========================================================================
     6. IMPORTATION DE FICHIER & SAUVEGARDE (LocalStorage)
     ========================================================================== */
  function setupBookmarkImport() {
    const btnImport = document.getElementById("btn-import-bookmarks");
    const fileInput = document.getElementById("bookmark-file");

    if (!btnImport || !fileInput) return;

    // Chargement automatique depuis le LocalStorage s'il existe une sauvegarde
    const savedTree = localStorage.getItem("nier_fav_tree");
    if (savedTree) {
      try {
        bookmarksTree = JSON.parse(savedTree);
        folderStack = [];
        renderCurrentFolder();
      } catch (e) {
        console.error("Erreur de chargement des favoris", e);
      }
    }

    // Le clic sur le bouton stylisé déclenche le champ file caché
    btnImport.addEventListener("click", () => fileInput.click());

    // Écoute le changement de fichier sélectionné
    fileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();

      // Une fois le fichier texte chargé
      reader.onload = (e) => {
        const content = e.target.result;
        const parser = new DOMParser();
        // Convertit la chaîne HTML du fichier en document DOM exploitable
        const doc = parser.parseFromString(content, "text/html");

        const rootDl = doc.querySelector("dl");
        if (rootDl) {
          // Extraction et sauvegarde dans LocalStorage
          bookmarksTree = parseBookmarksTree(rootDl);
          localStorage.setItem("nier_fav_tree", JSON.stringify(bookmarksTree));

          folderStack = [];
          renderCurrentFolder();

          alert("Favoris importés avec succès !");
        } else {
          alert("Structure de favoris invalide.");
        }
      };

      reader.readAsText(file);
    });
  }

  /* ==========================================================================
     7. GESTION DU SYSTÈME D'ONGLETS DU DASHBOARD
     ========================================================================== */
  const tabButtons = Array.from(document.querySelectorAll(".top-tabs .button"));
  const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

  /**
   * Active un onglet spécifique et affiche le panneau associé.
   * @param {HTMLElement} button - Le bouton d'onglet cliqué.
   */
  function activateTab(button) {
    if (!button) return;

    // Désactive tous les boutons d'onglets
    tabButtons.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });

    // Masque tous les panneaux d'onglets
    tabPanels.forEach((p) => {
      p.classList.remove("active");
      p.setAttribute("hidden", "");
    });

    // Active le bouton cliqué
    button.classList.add("active");
    button.setAttribute("aria-selected", "true");

    // Affiche le panneau correspondant
    const tabId = button.dataset.tab;
    const panel = document.getElementById(tabId);
    if (!panel) return;

    panel.classList.add("active");
    panel.removeAttribute("hidden");

    // Anime le titre H2 du panneau sélectionné
    const titleEl = panel.querySelector("h2");
    animateTitle(titleEl);

    // Relance l'animation des boutons spécifiques selon l'onglet
    if (tabId === "tab-fav") {
      const favContainer = panel.querySelector("#fav-buttons-container");
      if (favContainer) animateButtons(favContainer);
    } else if (tabId === "tab-settings") {
      animateButtons(panel);
    }
  }

  // Attache l'événement clic à chaque bouton de la barre d'onglets
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn));
  });

  /* ==========================================================================
     8. INITIALISATIONS AU DÉMARRAGE
     ========================================================================== */
  setupSearchInput();
  setupBookmarkImport();

  // Active le premier onglet actif ou par défaut le tout premier de la liste
  const initiallyActive = tabButtons.find((b) => b.classList.contains("active"));
  activateTab(initiallyActive || tabButtons[0]);
});