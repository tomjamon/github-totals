function debounce(func, wait) {
    let timeout;
    return function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, arguments), wait);
    };
}

function reloadPage() {
    assignations = {};
    observerTableau();
}

const debouncedReload = debounce(reloadPage, 1000);

function observeTableScrollContainer() {
    const targetNode = document.querySelector('[data-testid="table-scroll-container"]');
    if (!targetNode) {
        return;
    }
    const observerTable = new MutationObserver(function(mutationsList) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.tagName === 'DIV' && node.getAttribute('role') === 'rowgroup') {
                        assignations = {};
                        debouncedReload();
                    }
                });
            }
        }
    });
    observerTable.observe(targetNode,  { childList: true, subtree: true });
}

window.addEventListener('load', function() {
    observeTableScrollContainer();
});


const navigationElement = document.querySelector('div[role="navigation"]');
const buttonGroupElement = navigationElement.querySelector('[class^="ButtonGroup"]');
const projectDetailsButton = buttonGroupElement.querySelector('[aria-label="Project details"]');

const summariesButton = projectDetailsButton.cloneNode(true);
summariesButton.setAttribute('aria-label', 'Assignee Totals');
summariesButton.id = 'openSummaryModalBtn';
summariesButton.innerText = `Summaries`;

buttonGroupElement.appendChild(summariesButton);

const assigneeTotalsButton = projectDetailsButton.cloneNode(true);
assigneeTotalsButton.setAttribute('aria-label', 'Assignee Totals');
assigneeTotalsButton.id = 'openModalBtn';
assigneeTotalsButton.innerText = `Totals`;

buttonGroupElement.appendChild(assigneeTotalsButton);




let assignations = {};

chrome.storage.sync.get(['voirResume', 'voirTotaux'], (result) => {
    if (result.voirResume === 'no') {
        document.getElementById('openModalBtn').style.display = 'none';
    }
    if (result.voirTotaux === 'no') {
        document.getElementById('openSummaryModalBtn').style.display = 'none';
    }
});

function capturerDonneesLigne(row) {

    let titleElement = row.querySelector('[data-testid*="TableCell{row"][data-testid*=", column: Title"] a');
    let title = titleElement ? titleElement.textContent.trim() : null;
    if (!title) {
        titleElement = row.querySelector('[data-testid*="TableCell{row"][data-testid*=", column: Title"] span');
        title = titleElement ? titleElement.textContent.trim() : null;
    }

    let colonnesNumeriques = row.querySelectorAll('[data-testid^="TableCell{row"][role="gridcell"]');
    let sommesParColonne = {};

    // Sum per column
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

    // List of Columns
    let colonnesTextuelles = {};
    let textColumns = row.querySelectorAll('[role="gridcell"]');
    textColumns.forEach(colonne => {
        let nomColonne = colonne.getAttribute('data-testid');
        if (!nomColonne) return;
        let match = nomColonne.match(/column: ([^}]*)/);
        if (match) {
            nomColonne = match[1];
            if (nomColonne !== 'Title' && nomColonne !== 'Assignees') {
                let valeurElement = colonne.querySelector('[class*="TokenTextContainer"]');
                if (valeurElement) {
                    colonnesTextuelles[nomColonne] = valeurElement.textContent.trim();
                }
            }
        }
    });

    // Line with title in key, and sum per column and assignees in value
    if (title) {
        if (!assignations[title]) {
            assignations[title] = {
                sommesColonnes: {},
                assignees: [],
                colonnesTextuelles: colonnesTextuelles
            };
        }
        assignations[title].sommesColonnes = sommesParColonne;
        let assigneeElement = row.querySelector('[data-testid*="TableCell{row"][data-testid*=", column: Assignees"] img');
        let assigneeName = assigneeElement ? assigneeElement.alt : null;
        let assigneeAvatar = assigneeElement ? assigneeElement.src : null;
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

let observer;

function observerTableau() {
    let tableau = document.querySelector('[data-testid="table-scroll-container"]');
    if (tableau) {
        verifierTousLesLiens();
        observer = new MutationObserver((mutations) => {
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

        observer.observe(tableau, { childList: true, subtree: true });
    }
}

let intervalId = setInterval(() => {
    let tableau = document.querySelector('[data-testid="table-scroll-container"]');
    if (tableau) {
        clearInterval(intervalId);
        observerTableau();
    }
    mettreAJourTexteBouton();
}, 1000);

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
    <div class="gptots-popup" id="gptots-popup">
        <div id="progress-container">
            <div id="progress-bar"></div>
            <div id="progress-text">
                <div class="left-section" id="left-section">
                    <div class="text-container">
                        <h4 id="progress-count">- / -</h4>
                        <p id="progress-status">Keep scrolling ...</p>
                    </div>
                </div>
                <div class="right-section" id="right-section">
                    -<br><span>analysed</span>
                </div>
            </div>
        </div>
    </div>
    <div id="totauxModal" class="modal">
        <div class="modal-content">
            <button class="close-btn" id="closeModalBtn">-</button>
            <div id="modalContent"></div>
        </div>
    </div>
    <div id="summaryModal" class="modal">
        <div class="modal-content">
            <button class="close-btn" id="closeSummaryModalBtn">-</button>
            <div id="summaryContent"></div>
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
        tableauHTML += `<th style="padding: 8px;">${colonne}</th>`;
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

function fermerModal() {
    document.getElementById('totauxModal').style.display = 'none';
}

document.getElementById('openModalBtn').addEventListener('click', () => {
    document.getElementById('totauxModal').style.display = 'flex';  // Afficher la modal
    afficherTotauxDansModal();
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
    summaryContent.innerHTML = '';

    let gridContainer = document.createElement('div');
    gridContainer.className = 'grid-container';

    for (let colonne in totauxParColonne) {
        console.log(colonne);
        let colonnesNumeriques = Object.keys(totauxParColonne[colonne][Object.keys(totauxParColonne[colonne])[0]]);
        let tableauHTML = `<div class="table-container"><table class="styled-table"><thead><tr><th>${colonne}</th>`;
        colonnesNumeriques.forEach(colNum => {
            tableauHTML += `<th>${colNum}</th>`;
        });

        tableauHTML += `</tr></thead><tbody>`;
        for (let valeurColonne in totauxParColonne[colonne]) {
            tableauHTML += `<tr><td>${valeurColonne}</td>`;
            colonnesNumeriques.forEach(colNum => {
                tableauHTML += `<td>${totauxParColonne[colonne][valeurColonne][colNum] || 0}</td>`;
            });
            tableauHTML += `</tr>`;
        }
        tableauHTML += `</tbody></table></div>`;
        gridContainer.innerHTML += tableauHTML;
    }

    summaryContent.appendChild(gridContainer);

    if (Object.keys(totauxParColonne).length === 0) {
        summaryContent.innerHTML = '<p>Aucune donnée trouvée.</p>';
    }
}

let actualPercentage = 0;
let hideTimeout = null;
function updatePercentage(percentage) {
    if (percentage === actualPercentage) {
        return;
    }
    actualPercentage = percentage;
    clearTimeout(hideTimeout);

    const progressContainer = document.getElementById('progress-bar');
    progressContainer.style.width = percentage + '%';
    progressContainer.style.backgroundColor = calculateColor(percentage);

    const rightSection = document.getElementById('right-section');
    rightSection.innerHTML = percentage + '%<br><span>analysed</span>';

    const gptotsPopup = document.getElementById('gptots-popup');

    gptotsPopup.style.right = '0';
    gptotsPopup.style.opacity = '1';
    hideTimeout = setTimeout(() => {
        gptotsPopup.style.right = '-150px';
        gptotsPopup.style.opacity = '0';
    }, 2000);

    if (percentage === 100) {
        gptotsPopup.style.right = '-150px';
        gptotsPopup.style.opacity = '0';
        summariesButton.style.display = 'flex';
        assigneeTotalsButton.style.display = 'flex';
    } else {
        summariesButton.style.display = 'none';
        assigneeTotalsButton.style.display = 'none';
    }
}

function calculateColor(percentage) {
    let red, green;
    if (percentage <= 50) {
        red = 255;
        green = Math.floor((percentage / 50) * 255);
    } else {
        green = 255;
        red = Math.floor(255 - ((percentage - 50) / 50) * 255);
    }
    return `rgb(${red}, ${green}, 153)`;
}

function mettreAJourTexteBouton() {
    let nombreDeTicketsCaptures = Object.keys(assignations).length;
    let nombreTotalDeTickets = getTotalTicketsFromDOM();
    let bouton = document.getElementById('openModalBtn');

    if (nombreDeTicketsCaptures !== nombreTotalDeTickets) {
        bouton.innerText = `Totals - ${nombreDeTicketsCaptures}/${nombreTotalDeTickets}`;
    } else {
        bouton.innerText = `Totals`;
    }

    let gptotsModal = document.getElementById('progress-count');
    gptotsModal.innerText = `${nombreDeTicketsCaptures} / ${nombreTotalDeTickets}`;

    updatePercentage(Math.round((nombreDeTicketsCaptures / nombreTotalDeTickets) * 100));
}

function getTotalTicketsFromDOM() {
    let totalTicketsElement = document.querySelector('span[data-testid="filter-results-count"]');
    if (totalTicketsElement) {
        return parseInt(totalTicketsElement.textContent.trim(), 10);
    }
    return 0;
}

function calculerTotauxParColonne() {
    let totauxParColonne = {};
    for (let titre in assignations) {
        let tache = assignations[titre];
        let colonnesTextuelles = tache.colonnesTextuelles;
        console.log(colonnesTextuelles);
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
