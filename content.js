// Objet pour stocker les informations capturées
let assignations = {};

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
    // Sélectionner toutes les lignes déjà présentes dans le DOM avec le rôle "row"
    let lignesExistantes = document.querySelectorAll('[role="row"]');

    // Parcourir toutes les lignes et capturer leurs données
    lignesExistantes.forEach(ligne => {
        console.log('Ligne existante détectée:', ligne);
        capturerDonneesLigne(ligne);
    });
}

// Fonction qui initialise l'observation du DOM pour les lignes
function observerTableau() {
    // Sélectionner le conteneur de défilement de la table
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

        // Observer les changements dans les lignes
        let config = { childList: true, subtree: true };
        observer.observe(tableau, config);

        console.log("Observation des lignes démarrée.");
    } else {
        console.log("Tableau non trouvé, réessayer...");
    }
}

// Vérification périodique pour s'assurer que le tableau est bien chargé
let intervalId = setInterval(() => {
    let tableau = document.querySelector('[data-testid="table-scroll-container"]');
    if (tableau) {
        clearInterval(intervalId);
        console.log('Tableau trouvé, démarrage de l\'observation.');
        observerTableau();
    } else {
        console.log('Tableau non encore chargé, réessayer...');
    }
}, 1000);

let intervalId2 = setInterval(() => {
    console.log("Assignations:", assignations);
    let tableau = document.querySelector('[data-testid="table-scroll-container"]');

    if (tableau) {
        verifierTousLesLiens();
    }
    mettreAJourTexteBouton();
}, 2000);

// Fonction pour calculer les totaux des colonnes par assigné
function calculerTotauxParAssigne() {
    let totaux = {};

    // Parcourir toutes les lignes capturées
    for (let titre in assignations) {
        let tache = assignations[titre];

        // Pour chaque tâche, ajouter les valeurs par colonne aux assignés correspondants
        tache.assignees.forEach(assignee => {
            if (!totaux[assignee.name]) {
                totaux[assignee.name] = {
                    avatar: assignee.avatar,
                    colonnes: {}
                };
            }

            // Ajouter les sommes pour chaque colonne (par exemple, "Hrs spent")
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

// Insérer le bouton et la modal dans le document
const modalHTML = `
    <style>
        /* Styles pour le bouton fixe */
        #openModalBtn, #openSummaryModalBtn {
            position: fixed;
            bottom: 20px;
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            z-index: 1000;
        }
        #openModalBtn { right: 20px; }
        #openSummaryModalBtn { right: 140px; }

        /* Styles pour la modal */
        .modal {
            display: none;
            position: fixed;
            z-index: 1001;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            justify-content: center;
            align-items: center;
        }

        .modal-content {
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            width: 100%;
            margin: 5%;
            max-width: 80%;
            text-align: left;
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
    </style>

    <!-- Bouton en position fixe -->
    <button id="openModalBtn">Voir Totaux</button>
    <button id="openSummaryModalBtn">Voir Résumés</button>

    <!-- Modal pour afficher les totaux -->
    <div id="totauxModal" class="modal">
        <div class="modal-content">
            <button class="close-btn" id="closeModalBtn">Fermer</button>
            <h3>Totaux par assigné</h3>
            <div id="modalContent">
                <!-- Les totaux seront insérés ici -->
            </div>
        </div>
    </div>

    <!-- Modal pour afficher les résumés -->
    <div id="summaryModal" class="modal">
        <div class="modal-content">
            <button class="close-btn" id="closeSummaryModalBtn">Fermer</button>
            <h3>Résumé par statut</h3>
            <div id="summaryContent">
                <!-- Les résumés seront insérés ici -->
            </div>
        </div>
    </div>
`;
document.body.insertAdjacentHTML('beforeend', modalHTML);

// Fonction pour calculer les totaux par statut
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

// Fonction pour afficher les totaux dans un tableau dans la modal
function afficherTotauxDansModal() {
    let totaux = calculerTotauxParAssigne();
    let modalContent = document.getElementById('modalContent');

    // Créer un ensemble unique de toutes les colonnes rencontrées
    let colonnes = new Set();

    // Parcourir les totaux pour collecter tous les types de colonnes
    for (let assignee in totaux) {
        for (let colonne in totaux[assignee].colonnes) {
            colonnes.add(colonne);
        }
    }

    // Créer le tableau HTML pour afficher les totaux par assigné et par colonne
    let tableauHTML = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
                <tr>
                    <th style="padding: 8px; border-bottom: 2px solid #ddd;">Assigné</th>
    `;

    // Ajouter les colonnes dynamiquement dans le tableau
    colonnes.forEach(colonne => {
        tableauHTML += `<th style="padding: 8px; border-bottom: 2px solid #ddd;">${colonne}</th>`;
    });

    tableauHTML += `
                </tr>
            </thead>
            <tbody>
    `;

    // Ajouter chaque assigné et ses valeurs par colonne dans le tableau
    for (let assignee in totaux) {
        let assigneeData = totaux[assignee];  // Récupérer les données de l'assigné

        tableauHTML += `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                <img src="${assigneeData.avatar}" alt="${assignee}" style="width: 20px; height: 20px; border-radius: 50%; vertical-align: middle; margin-right: 8px;">
                ${assignee}
            </td>`;

        // Ajouter les valeurs pour chaque colonne, en mettant "0" si aucune valeur n'existe
        colonnes.forEach(colonne => {
            let valeur = assigneeData.colonnes[colonne] || 0;
            tableauHTML += `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${valeur}</td>`;
        });

        tableauHTML += `</tr>`;
    }

    // Fermer le tableau
    tableauHTML += `
            </tbody>
        </table>
    `;

    // Si aucun assigné n'est trouvé, afficher un message
    if (Object.keys(totaux).length === 0) {
        tableauHTML = '<p>Aucun assigné trouvé.</p>';
    }

    // Insérer le tableau dans la modal
    modalContent.innerHTML = tableauHTML;

    // Mettre à jour le texte du bouton avec le nombre de tickets capturés et total
    mettreAJourTexteBouton();
}

// Fonction pour mettre à jour le texte du bouton avec le nombre de tickets
function mettreAJourTexteBouton() {
    let nombreDeTicketsCaptures = Object.keys(assignations).length;
    let nombreTotalDeTickets = getTotalTicketsFromDOM();
    let bouton = document.getElementById('openModalBtn');

    // Mettre à jour le texte du bouton
    bouton.innerText = `Voir Totaux (${nombreDeTicketsCaptures}/${nombreTotalDeTickets})`;
}

function fermerModal() {
    document.getElementById('totauxModal').style.display = 'none';
}

// Gérer l'ouverture et la fermeture de la modal
document.getElementById('openModalBtn').addEventListener('click', () => {
    document.getElementById('totauxModal').style.display = 'flex';  // Afficher la modal
    afficherTotauxDansModal();  // Afficher les résultats dans la modal
});

document.getElementById('closeModalBtn').addEventListener('click', fermerModal);

// Fermer la modal en cliquant en dehors de la boîte de contenu
window.addEventListener('click', (event) => {
    let modal = document.getElementById('totauxModal');
    if (event.target === modal) {
        fermerModal();
    }
});

// Écouter l'événement 'keydown' pour fermer la modal avec la touche ESC
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {  // Vérifier si la touche est 'ESC'
        let modal = document.getElementById('totauxModal');
        if (modal.style.display === 'flex') {
            fermerModal();
        }
    }
});

// Fonction pour afficher les résumés par colonne textuelle dans plusieurs tableaux
// Fonction pour afficher les résumés par colonne textuelle dans plusieurs tableaux avec styles
function afficherResumesParColonnesDansModal() {
    let totauxParColonne = calculerTotauxParColonne();
    let summaryContent = document.getElementById('summaryContent');

    // Réinitialiser le contenu
    summaryContent.innerHTML = '';

    // Parcourir chaque colonne textuelle pour créer un tableau
    for (let colonne in totauxParColonne) {
        let tableauHTML = `
            <div class="table-container">
                <h4 class="table-title">${colonne}</h4>
                <table class="styled-table">
                    <thead>
                        <tr>
                            <th>${colonne}</th>
                            <th>Détails</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Parcourir chaque valeur de cette colonne (ex: "Terminé", "Haute")
        for (let valeurColonne in totauxParColonne[colonne]) {
            let details = '';

            // Parcourir chaque colonne numérique et ajouter les totaux
            for (let colonneNumerique in totauxParColonne[colonne][valeurColonne]) {
                details += `${colonneNumerique}: ${totauxParColonne[colonne][valeurColonne][colonneNumerique]}<br>`;
            }

            // Ajouter une ligne pour chaque valeur de la colonne (ex: "Terminé", "Haute")
            tableauHTML += `
                <tr>
                    <td>${valeurColonne}</td>
                    <td>${details}</td>
                </tr>
            `;
        }

        // Fermer le tableau
        tableauHTML += `
                    </tbody>
                </table>
            </div>
        `;

        // Ajouter chaque tableau à la modal
        summaryContent.innerHTML += tableauHTML;
    }

    // Si aucun total n'est trouvé, afficher un message
    if (Object.keys(totauxParColonne).length === 0) {
        summaryContent.innerHTML = '<p>Aucune donnée trouvée.</p>';
    }
}

// Ajouter les styles dans le <head>
const styles = `
    <style>
        /* Conteneur de tableau avec disposition en inline-block */
        .table-container {
            display: inline-block;
            vertical-align: top;
            margin: 10px;
            width: 300px;
        }

        /* Titre du tableau */
        .table-title {
            background-color: #f7f7f7;
            padding: 10px;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            border-radius: 5px 5px 0 0;
            border: 1px solid #ddd;
            margin: 0;
        }

        /* Tableau stylisé */
        .styled-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border-radius: 5px;
            overflow: hidden;
        }

        .styled-table thead {
            background-color: #f1f1f1;
        }

        .styled-table th, .styled-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }

        /* Alternance des couleurs de fond */
        .styled-table tbody tr:nth-child(even) {
            background-color: #f9f9f9;
        }

        .styled-table tbody tr:nth-child(odd) {
            background-color: #ffffff;
        }

        .styled-table tbody tr:hover {
            background-color: #f1f1f1;
        }

        /* Style pour les cellules de détail */
        .styled-table td {
            vertical-align: top;
        }

    </style>
`;

// Ajouter les styles dans le <head>
document.head.insertAdjacentHTML('beforeend', styles);

// Fonction pour récupérer le nombre total de tickets à partir du DOM
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

// Fonction pour calculer les totaux par colonne textuelle (autre que Title et Assignees)
function calculerTotauxParColonne() {
    let totauxParColonne = {};

    // Parcourir toutes les lignes capturées
    for (let titre in assignations) {
        let tache = assignations[titre];
        let colonnesTextuelles = tache.colonnesTextuelles;

        // Parcourir chaque colonne textuelle
        for (let colonne in colonnesTextuelles) {
            let valeurColonne = colonnesTextuelles[colonne];  // La valeur de la colonne (ex: "Terminé", "Haute")

            // Initialiser la colonne dans les totaux s'il n'existe pas encore
            if (!totauxParColonne[colonne]) {
                totauxParColonne[colonne] = {};
            }

            // Initialiser la valeur de la colonne dans les totaux s'il n'existe pas encore
            if (!totauxParColonne[colonne][valeurColonne]) {
                totauxParColonne[colonne][valeurColonne] = {};
            }

            // Ajouter les sommes pour chaque colonne numérique
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

// Fonction pour afficher les résumés par statut dans un tableau dans la modal
function afficherResumesDansModal() {
    let totauxParStatut = calculerTotauxParStatut();
    let summaryContent = document.getElementById('summaryContent');

    // Créer le tableau HTML pour afficher les résumés par statut et par colonne
    let tableauHTML = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
                <tr>
                    <th style="padding: 8px; border-bottom: 2px solid #ddd;">Statut</th>
                    <th style="padding: 8px; border-bottom: 2px solid #ddd;">Détails</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Ajouter chaque statut et ses totaux dans le tableau
    for (let statut in totauxParStatut) {
        let details = '';

        for (let colonne in totauxParStatut[statut]) {
            details += `${colonne}: ${totauxParStatut[statut][colonne]} - `;
        }

        // Supprimer le dernier tiret (-) en trop
        details = details.slice(0, -2);

        tableauHTML += `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${statut}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${details}</td>
            </tr>
        `;
    }

    // Fermer le tableau
    tableauHTML += `
            </tbody>
        </table>
    `;

    // Si aucun statut n'est trouvé, afficher un message
    if (Object.keys(totauxParStatut).length === 0) {
        tableauHTML = '<p>Aucun statut trouvé.</p>';
    }

    // Insérer le tableau dans la modal
    summaryContent.innerHTML = tableauHTML;
}
// Gérer l'ouverture et la fermeture de la modal avec le bouton "Voir Résumés"
document.getElementById('openSummaryModalBtn').addEventListener('click', () => {
    document.getElementById('summaryModal').style.display = 'flex';  // Afficher la modal
    afficherResumesParColonnesDansModal();
    // afficherResumesDansModal();  // Afficher les résumés dans la modal
});

document.getElementById('closeSummaryModalBtn').addEventListener('click', () => {
    document.getElementById('summaryModal').style.display = 'none';  // Fermer la modal
});

// Fermer la modal en cliquant en dehors de la boîte de contenu
window.addEventListener('click', (event) => {
    let modal = document.getElementById('summaryModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});
