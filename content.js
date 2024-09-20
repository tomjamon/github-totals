// Objet pour stocker les informations capturées
let assignations = {};

chrome.storage.sync.get(['voirResume', 'voirTotaux'], (result) => {
    if (result.voirResume === 'no') {
        document.getElementById('openModalBtn').style.display = 'none';
    }
    if (result.voirTotaux === 'no') {
        document.getElementById('openSummaryModalBtn').style.display = 'none';
    }
});

// Fonction pour capturer les données d'une ligne
function capturerDonneesLigne(row) {
    // Récupérer le titre de la ligne
    let titleElement = row.querySelector('[data-testid*="TableCell{row"][data-testid*=", column: Title"] a');
    let title = titleElement ? titleElement.textContent.trim() : null;
    if (!title) {
        titleElement = row.querySelector('[data-testid*="TableCell{row"][data-testid*=", column: Title"] span');
        title = titleElement ? titleElement.textContent.trim() : null;
    }

    // Récupérer toutes les colonnes contenant des nombres (classe "firrQr")
    let colonnesNumeriques = row.querySelectorAll('[data-testid^="TableCell{row"][role="gridcell"]');

    // Stocker les sommes des colonnes numériques dans un objet
    let sommesParColonne = {};

    // Parcourir chaque colonne pour vérifier si elle contient un nombre (classe "firrQr")
    colonnesNumeriques.forEach(colonne => {
        let nomColonne = colonne.getAttribute('data-testid');
        let match = nomColonne.match(/column: ([^}]*)/);
        if (match) {
            nomColonne = match[1];
        }

        let valeurElement = colonne.querySelector('.firrqR span');
        if (valeurElement) {
            let valeur = parseFloat(valeurElement.textContent.trim());
            if (!isNaN(valeur)) {
                if (!sommesParColonne[nomColonne]) {
                    sommesParColonne[nomColonne] = 0;
                }
                sommesParColonne[nomColonne] += valeur;
            }
        }
    });

    // Récupérer l'assigné et l'URL de l'avatar
    let assigneeElement = row.querySelector('[data-testid*="TableCell{row"][data-testid*=", column: Assignees"] img');
    let assigneeName = assigneeElement ? assigneeElement.alt : null;
    let assigneeAvatar = assigneeElement ? assigneeElement.src : null;

    // Capturer les colonnes textuelles spécifiques avec la classe "hWqAbU", en excluant "Title" et "Assignees"
    let colonnesTextuelles = {};
    let textColumns = row.querySelectorAll('[role="gridcell"]');
    textColumns.forEach(colonne => {
        let nomColonne = colonne.getAttribute('data-testid');
        let match = nomColonne.match(/column: ([^}]*)/);
        if (match) {
            nomColonne = match[1];

            // Exclure les colonnes "Title" et "Assignees"
            if (nomColonne !== 'Title' && nomColonne !== 'Assignees') {
                // Vérifier si l'élément a un texte avec la classe "hWqAbU"
                let valeurElement = colonne.querySelector('.hWqAbU');
                if (valeurElement) {
                    colonnesTextuelles[nomColonne] = valeurElement.textContent.trim();
                }
            }
        }
    });

    // Si le titre est trouvé, on stocke les données dans l'objet assignations
    if (title) {
        if (!assignations[title]) {
            assignations[title] = {
                sommesColonnes: {},
                assignees: [],
                colonnesTextuelles: colonnesTextuelles // Stocker les colonnes textuelles filtrées
            };
        }

        assignations[title].sommesColonnes = sommesParColonne;

        // Ajouter l'assigné et son avatar s'il n'est pas déjà présent
        if (assigneeName && !assignations[title].assignees.some(a => a.name === assigneeName)) {
            assignations[title].assignees.push({ name: assigneeName, avatar: assigneeAvatar });
        }
    }
}
function verifierTousLesLiens() {
    let lignesExistantes = document.querySelectorAll('[role="row"]');
    lignesExistantes.forEach(ligne => {
        capturerDonneesLigne(ligne);
    });
}

function observerTableau() {
    let tableau = document.querySelector('[data-testid="table-scroll-container"]');
    if (tableau) {
        verifierTousLesLiens();
        let observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    // Vérifier si le noeud ajouté est une ligne avec role="row"
                    if (node.nodeType === 1 && node.matches('[role="row"]')) {
                        // Capturer les données de la ligne ajoutée
                        capturerDonneesLigne(node);
                    }
                });
            });
        });

        let config = { childList: true, subtree: true };
        observer.observe(tableau, config);
    }
}

let intervalId = setInterval(() => {
    let tableau = document.querySelector('[data-testid="table-scroll-container"]');
    if (tableau) {
        clearInterval(intervalId);
        observerTableau();
    }
}, 1000);

let intervalId2 = setInterval(() => {
    let tableau = document.querySelector('[data-testid="table-scroll-container"]');

    if (tableau) {
        verifierTousLesLiens();
    }
    mettreAJourTexteBouton();
}, 2000);

function calculerTotauxParAssigne() {
    let totaux = {};
    for (let titre in assignations) {
        let tache = assignations[titre];
        tache.assignees.forEach(assignee => {
            if (!totaux[assignee.name]) {
                totaux[assignee.name] = {
                    avatar: assignee.avatar,
                    colonnes: {}
                };
            }
            for (let colonne in tache.sommesColonnes) {
                if (!totaux[assignee.name].colonnes[colonne]) {
                    totaux[assignee.name].colonnes[colonne] = 0;
                }
                totaux[assignee.name].colonnes[colonne] += tache.sommesColonnes[colonne];
            }
        });
    }

    return totaux;
}

const modalHTML = `
    <!-- Bouton en position fixe -->
    <div id="buttonContainer">
        <button id="openModalBtn">Voir Totaux</button>
        <button id="openSummaryModalBtn">Voir Résumés</button>
    </div>

    <!-- Modal pour afficher les totaux -->
    <div id="totauxModal" class="modal">
        <div class="modal-content">
            <button class="close-btn" id="closeModalBtn">X</button>
            <div id="modalContent">
                <!-- Les totaux seront insérés ici -->
            </div>
        </div>
    </div>

    <!-- Modal pour afficher les résumés -->
    <div id="summaryModal" class="modal">
        <div class="modal-content">
            <button class="close-btn" id="closeSummaryModalBtn">X</button>
            <div id="summaryContent">
                <!-- Les résumés seront insérés ici -->
            </div>
        </div>
    </div>
`;
document.body.insertAdjacentHTML('beforeend', modalHTML);

function calculerTotauxParStatut() {
    let totauxParStatut = {};

    // Parcourir toutes les lignes capturées
    for (let titre in assignations) {
        let tache = assignations[titre];
        let statut = tache.statut;  // Assumons que nous avons stocké le statut de chaque ligne lors de la capture

        if (!statut) continue; // Si le statut n'est pas défini, on ignore cette ligne

        // Initialiser le statut dans les totaux s'il n'existe pas encore
        if (!totauxParStatut[statut]) {
            totauxParStatut[statut] = {};
        }

        // Ajouter les sommes pour chaque colonne (par exemple "Hrs spent")
        for (let colonne in tache.sommesColonnes) {
            if (!totauxParStatut[statut][colonne]) {
                totauxParStatut[statut][colonne] = 0;
            }
            totauxParStatut[statut][colonne] += tache.sommesColonnes[colonne];
        }
    }

    return totauxParStatut;
}

function afficherTotauxDansModal() {
    let totaux = calculerTotauxParAssigne();
    let modalContent = document.getElementById('modalContent');
    let colonnes = new Set();
    for (let assignee in totaux) {
        for (let colonne in totaux[assignee].colonnes) {
            colonnes.add(colonne);
        }
    }
    let tableauHTML = `
<div class="table-container">
    <table class="styled-table">
        <thead>
            <tr>
                <th>Assignes</th>
    `;

    colonnes.forEach(colonne => {
        tableauHTML += `<th style="padding: 8px; border-bottom: 2px solid #ddd;">${colonne}</th>`;
    });

    tableauHTML += `
                </tr>
            </thead>
            <tbody>
    `;

    for (let assignee in totaux) {
        let assigneeData = totaux[assignee];

        tableauHTML += `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                <img src="${assigneeData.avatar}" alt="${assignee}" style="width: 20px; height: 20px; border-radius: 50%; vertical-align: middle; margin-right: 8px;">
                ${assignee}
            </td>`;

        colonnes.forEach(colonne => {
            let valeur = assigneeData.colonnes[colonne] || 0;
            tableauHTML += `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${valeur}</td>`;
        });

        tableauHTML += `</tr>`;
    }

    tableauHTML += `
            </tr>
                    </thead>
                    <tbody>
    `;

    if (Object.keys(totaux).length === 0) {
        tableauHTML = '<p>Aucun assigné trouvé.</p>';
    }

    modalContent.innerHTML = tableauHTML;
    mettreAJourTexteBouton();
}

function mettreAJourTexteBouton() {
    let nombreDeTicketsCaptures = Object.keys(assignations).length;
    let nombreTotalDeTickets = getTotalTicketsFromDOM();
    let bouton = document.getElementById('openModalBtn');
    bouton.innerText = `Voir Totaux (${nombreDeTicketsCaptures}/${nombreTotalDeTickets})`;
}

function fermerModal() {
    document.getElementById('totauxModal').style.display = 'none';
}

document.getElementById('openModalBtn').addEventListener('click', () => {
    document.getElementById('totauxModal').style.display = 'flex';  // Afficher la modal
    afficherTotauxDansModal();  // Afficher les résultats dans la modal
});

document.getElementById('closeModalBtn').addEventListener('click', fermerModal);

window.addEventListener('click', (event) => {
    let modal = document.getElementById('totauxModal');
    if (event.target === modal) {
        fermerModal();
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {  // Vérifier si la touche est 'ESC'
        let modal = document.getElementById('totauxModal');
        if (modal.style.display === 'flex') {
            fermerModal();
        }
    }
});

function afficherResumesParColonnesDansModal() {
    let totauxParColonne = calculerTotauxParColonne();
    let summaryContent = document.getElementById('summaryContent');

    // Réinitialiser le contenu
    summaryContent.innerHTML = '';

    // Conteneur pour tous les tableaux avec mise en page en grille
    let gridContainer = document.createElement('div');
    gridContainer.className = 'grid-container';

    // Parcourir chaque colonne textuelle pour créer un tableau
    for (let colonne in totauxParColonne) {
        // Créer l'en-tête avec les colonnes dynamiques pour chaque valeur numérique
        let colonnesNumeriques = Object.keys(totauxParColonne[colonne][Object.keys(totauxParColonne[colonne])[0]]);

        let tableauHTML = `
            <div class="table-container">
                <!--<h4 class="table-title">${colonne}</h4>-->
                <table class="styled-table">
                    <thead>
                        <tr>
                            <th>${colonne}</th>
        `;

        // Ajouter les en-têtes des colonnes numériques (Hrs spent, Hrs estimated, etc.)
        colonnesNumeriques.forEach(colNum => {
            tableauHTML += `<th>${colNum}</th>`;
        });

        tableauHTML += `
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Parcourir chaque valeur de cette colonne textuelle (ex: "Terminé", "Haute")
        for (let valeurColonne in totauxParColonne[colonne]) {
            tableauHTML += `
                <tr>
                    <td>${valeurColonne}</td>
            `;

            // Ajouter les valeurs numériques dans leurs colonnes respectives
            colonnesNumeriques.forEach(colNum => {
                tableauHTML += `<td>${totauxParColonne[colonne][valeurColonne][colNum] || 0}</td>`;
            });

            tableauHTML += `</tr>`;
        }

        // Fermer le tableau
        tableauHTML += `
                    </tbody>
                </table>
            </div>
        `;

        // Ajouter chaque tableau dans le conteneur de la grille
        gridContainer.innerHTML += tableauHTML;
    }

    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&family=Mukta:wght@300;400;600;700;800&family=Noto+Sans:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    // Ajouter le conteneur de la grille dans la modal
    summaryContent.appendChild(gridContainer);

    // Si aucun total n'est trouvé, afficher un message
    if (Object.keys(totauxParColonne).length === 0) {
        summaryContent.innerHTML = '<p>Aucune donnée trouvée.</p>';
    }
}

const styles = `
<style>
    #buttonContainer {
        position: fixed;
        bottom: 0;
        width: 100%;
        display: flex;
        justify-content: space-between;
        padding: 10px;
        background-color: #fff; /* ou n'importe quelle couleur de fond souhaitée */
        z-index: 1000;
    }
    
    #openModalBtn, #openSummaryModalBtn {
        flex: 1;
        margin: 0 5px; /* Ajoute de l'espace entre les boutons */
        padding: 10px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        text-align: center;
    }

        /* Bouton pour fermer la modal */
        .close-btn {
            background-color: red;
            color: white;
            padding: 5px 10px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            float: right;
        }
                
        .grid-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            grid-gap: 20px;
            height: 100%; /* Pour que le conteneur s'ajuste à la hauteur totale */
        }
        
:root {
  --clr-primary: #81d4fa;
  --clr-primary-light: #e1f5fe;
  --clr-primary-dark: #4fc3f7;
  --clr-gray100: #f9fbff;
  --clr-gray150: #f4f6fb;
  --clr-gray200: #eef1f6;
  --clr-gray300: #e1e5ee;
  --clr-gray400: #767b91;
  --clr-gray500: #4f546c;
  --clr-gray600: #2a324b;
  --clr-gray700: #161d34;
  --clr-pending: #fff0c2;
  --clr-pending-font: #a68b00;
  --clr-unpaid: #ffcdd2;
  --clr-unpaid-font: #c62828;
  --clr-paid: #c8e6c9;
  --clr-paid-font: #388e3c;
  --clr-link: #2962ff;
  --radius: 0.2rem;
}

[role="tabpanel"] {
    font-family: 'Mukta', sans-serif;
}

.table-container table {
font-family: 'Mukta', sans-serif;
  border-collapse: collapse;
  box-shadow: 0 5px 10px var(--clr-gray600);
  background-color: white;
  text-align: left;
  overflow: hidden;
  width: 100%;
  max-width: 800px;
}

.table-container thead {
  box-shadow: 0 5px 10px var(--clr-gray300);
}

.table-container th {
  padding: 1rem 2rem;
  text-transform: uppercase;
  letter-spacing: 0.1rem;
  font-size: 0.7rem;
  font-weight: 900;
  background-color: var(--clr-gray200);
  color: var(--clr-gray600);
}

.table-container td {
  padding: 1rem 2rem;
}

.table-container a {
  text-decoration: none;
  color: var(--clr-link);
}

.table-container .status {
  border-radius: var(--radius);
  padding: 0.2rem 1rem;
  text-align: center;
}

.table-container .status-pending {
  background-color: var(--clr-pending);
  color: var(--clr-pending-font);
}

.table-container .status-paid {
  background-color: var(--clr-paid);
  color: var(--clr-paid-font);
}

.table-container .status-unpaid {
  background-color: var(--clr-unpaid);
  color: var(--clr-unpaid-font);
}

.table-container .amount {
  text-align: right;
}

/* Alternating row colors */
.table-container tbody tr:nth-child(even) {
  background-color: var(--clr-gray200);
}

.table-container tbody tr:nth-child(odd) {
  background-color: var(--clr-gray100);
}

/* Hover effect */
.table-container tbody tr:hover {
  background-color: var(--clr-gray400);
}
     
        /* Styles pour la modal qui prend tout l'écran */
        .modal {
            display:none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.5); /* Fond de la modal */
            justify-content: center;
            align-items: center;
            z-index: 1000; /* Assure que la modal est au-dessus */
        }
        
        /* Contenu de la modal */
        .modal-content {
            width: 90vw;
            height: 90vh;
            border-radius: 10px;
            padding: 20px;
            overflow-y: auto; /* Scroll si le contenu dépasse en hauteur */
            overflow-x: hidden; /* Pas de scroll horizontal */
        }
        
        .modal.fade-in {
            animation: fadeIn 0.3s ease;
        }
        
        /* Animation fade-in */
        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }
        
        /* Styles pour le backdrop */
        .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999; /* Juste en dessous de la modal */
        }
        
        
        
        /** 
        APPLY CSS ON GITHUB PROJECT
         */
[data-testid^="table-group"] {
  box-shadow: 0 5px 10px var(--clr-gray300);
  background-color: white;
}

[data-testid^="table-group"] [role="rowgroup"] {
  background-color: var(--clr-primary-light);
  font-size: 0.7rem;
  font-weight: 900;
  text-transform: uppercase;
  color: var(--clr-gray600);
}

[data-testid^="table-group"] [role="row"] {
    padding: 10px 0;
    height: auto !important;
}

[data-testid^="table-group"] [role="row"] [role="gridcell"] {
  border:none;
}


[data-testid^="table-group"] [role="row"]:nth-child(even) {
  background-color: white !important;
}

[data-testid^="table-group"] [role="row"]:nth-child(odd) {
  background-color: white !important;
}

[data-testid^="table-group"] [role="row"]:hover {
  background-color: var(--clr-gray300) !important;
}

[data-testid^="table-group"] .status {
  border-radius: var(--radius);
  /*padding: 0.2rem 1rem;*/
  text-align: center;
}

[data-testid^="table-group"] .status-pending {
  background-color: var(--clr-pending);
  color: var(--clr-pending-font);
}

[data-testid^="table-group"] .status-paid {
  background-color: var(--clr-paid);
  color: var(--clr-paid-font);
}

[data-testid^="table-group"] .status-unpaid {
  background-color: var(--clr-unpaid);
  color: var(--clr-unpaid-font);
}

[data-testid^="table-group"] .amount {
  text-align: right;
}

[data-testid^="single-select-token"] {
    border-radius: 0.2rem;
    width:100%;
    flex:1;
    /* background-color: red; */
    padding: 0.5rem 1rem;
    height: auto;
    text-align: center;
    border: none;
}
div:has([data-testid^="single-select-token"]) {
    width:100%;
    flex:1;
}

[data-testid^="group-name"] {
      padding: 1rem 2rem;
      text-transform: uppercase;
      letter-spacing: 0.1rem;
      font-size: 0.7rem;
      font-weight: 900;
      color: var(--clr-gray600);
}
    
    </style>
`;

document.head.insertAdjacentHTML('beforeend', styles);

function getTotalTicketsFromDOM() {
    // Chercher l'élément contenant le nombre total de tickets
    let totalTicketsElement = document.querySelector('span[data-testid="filter-results-count"]');

    // Si l'élément existe, récupérer le texte et le convertir en nombre
    console.log(totalTicketsElement);
    if (totalTicketsElement) {
        return parseInt(totalTicketsElement.textContent.trim(), 10);
    }
    return 0;  // Retourner 0 si l'élément n'est pas trouvé
}

function calculerTotauxParColonne() {
    let totauxParColonne = {};
    for (let titre in assignations) {
        let tache = assignations[titre];
        let colonnesTextuelles = tache.colonnesTextuelles;
        for (let colonne in colonnesTextuelles) {
            let valeurColonne = colonnesTextuelles[colonne];
            if (!totauxParColonne[colonne]) {
                totauxParColonne[colonne] = {};
            }
            if (!totauxParColonne[colonne][valeurColonne]) {
                totauxParColonne[colonne][valeurColonne] = {};
            }
            for (let colonneNumerique in tache.sommesColonnes) {
                if (!totauxParColonne[colonne][valeurColonne][colonneNumerique]) {
                    totauxParColonne[colonne][valeurColonne][colonneNumerique] = 0;
                }
                totauxParColonne[colonne][valeurColonne][colonneNumerique] += tache.sommesColonnes[colonneNumerique];
            }
        }
    }

    return totauxParColonne;
}

document.getElementById('openSummaryModalBtn').addEventListener('click', () => {
    document.getElementById('summaryModal').style.display = 'flex';
    afficherResumesParColonnesDansModal();
});

document.getElementById('closeSummaryModalBtn').addEventListener('click', () => {
    document.getElementById('summaryModal').style.display = 'none';
});

function fermerModals() {
    document.getElementById('totauxModal').style.display = 'none';
    document.getElementById('summaryModal').style.display = 'none';
}

window.addEventListener('click', (event) => {
    let summaryModal = document.getElementById('summaryModal');
    let totauxModal = document.getElementById('totauxModal');
    if ((event.target === summaryModal)||(event.target === totauxModal)) {
        fermerModals();
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        fermerModals();
    }
});
