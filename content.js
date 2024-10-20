function debounce(func, wait) {
    let timeout;
    return function () {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, arguments), wait);
    };
}

function reloadPage() {
    assignments = {};
    observeTable();
}

const debouncedReload = debounce(reloadPage, 1000);

function observeTableScrollContainer() {
    const targetNode = document.querySelector('[data-testid="table-scroll-container"]');
    if (!targetNode) {
        return;
    }
    const observerTable = new MutationObserver(function (mutationsList) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.tagName === 'DIV' && node.getAttribute('role') === 'rowgroup') {
                        assignments = {};
                        debouncedReload();
                    }
                });
            }
        }
    });
    observerTable.observe(targetNode, {childList: true, subtree: true});
}

window.addEventListener('load', function () {
    observeTableScrollContainer();
});

let summariesButton, assigneeTotalsButton;

function addButtons() {
    const navigationElement = document.querySelector('div[role="navigation"]');
    const buttonGroupElement = navigationElement.querySelector('[class^="ButtonGroup"]');
    const projectDetailsButton = buttonGroupElement.querySelector('[aria-label="Project details"]');

    summariesButton = projectDetailsButton.cloneNode(true);
    summariesButton.setAttribute('aria-label', 'Summaries');
    summariesButton.id = 'openSummaryModalBtn';
    summariesButton.innerText = `Summaries`;

    buttonGroupElement.appendChild(summariesButton);

    assigneeTotalsButton = projectDetailsButton.cloneNode(true);
    assigneeTotalsButton.setAttribute('aria-label', 'Assignee Totals');
    assigneeTotalsButton.id = 'openModalBtn';
    assigneeTotalsButton.innerText = `Totals`;

    buttonGroupElement.appendChild(assigneeTotalsButton);
}

addButtons();

let assignments = {};

function captureRowData(row) {
    let titleElement = row.querySelector('[data-testid*="TableCell{row"][data-testid*=", column: Title"] a');
    let title = titleElement ? titleElement.textContent.trim() : null;
    if (!title) {
        titleElement = row.querySelector('[data-testid*="TableCell{row"][data-testid*=", column: Title"] span');
        title = titleElement ? titleElement.textContent.trim() : null;
    }

    let numericColumns = row.querySelectorAll('[data-testid^="TableCell{row"][role="gridcell"]');
    let columnSums = {};

    numericColumns.forEach(col => {
        let colName = col.getAttribute('data-testid');
        let match = colName.match(/column: ([^}]*)/);
        if (match) {
            colName = match[1];
        }
        let valueElement = col.querySelector('.firrqR span');
        if (valueElement) {
            let value = parseFloat(valueElement.textContent.trim());
            if (!isNaN(value)) {
                if (!columnSums[colName]) {
                    columnSums[colName] = 0;
                }
                columnSums[colName] += value;
            }
        }
    });

    let textColumns = {};
    let allColumns = row.querySelectorAll('[role="gridcell"]');
    allColumns.forEach(col => {
        let colName = col.getAttribute('data-testid');
        if (!colName) return;
        let match = colName.match(/column: ([^}]*)/);
        if (match) {
            colName = match[1];
            if (colName !== 'Title' && colName !== 'Assignees') {
                let valueElement = col.querySelector('[class*="TokenTextContainer"]');
                if (valueElement) {
                    textColumns[colName] = valueElement.textContent.trim();
                }
            }
        }
    });

    if (title) {
        if (!assignments[title]) {
            assignments[title] = {
                columnSums: {},
                assignees: [],
                textColumns: textColumns
            };
        }
        assignments[title].columnSums = columnSums;
        let assigneeElement = row.querySelector('[data-testid*="TableCell{row"][data-testid*=", column: Assignees"] img');
        let assigneeName = assigneeElement ? assigneeElement.alt : null;
        let assigneeAvatar = assigneeElement ? assigneeElement.src : null;
        if (assigneeName && !assignments[title].assignees.some(a => a.name === assigneeName)) {
            assignments[title].assignees.push({name: assigneeName, avatar: assigneeAvatar});
        }
    }
}

function checkAllRows() {
    let existingRows = document.querySelectorAll('[role="row"]');
    existingRows.forEach(row => {
        captureRowData(row);
    });
}

let observer;

function observeTable() {
    let table = document.querySelector('[data-testid="table-scroll-container"]');
    if (table) {
        checkAllRows();
        observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.matches('[role="row"]')) {
                        captureRowData(node);
                    }
                });
            });
        });
        observer.observe(table, {childList: true, subtree: true});
    }
}

let intervalId = setInterval(() => {
    let table = document.querySelector('[data-testid="table-scroll-container"]');
    if (table) {
        clearInterval(intervalId);
        observeTable();
    }
    updateButtonText();
}, 1000);

function calculateTotalsByAssignee() {
    let totals = {};
    for (let title in assignments) {
        let task = assignments[title];
        task.assignees.forEach(assignee => {
            if (!totals[assignee.name]) {
                totals[assignee.name] = {
                    avatar: assignee.avatar,
                    columns: {}
                };
            }
            for (let column in task.columnSums) {
                if (!totals[assignee.name].columns[column]) {
                    totals[assignee.name].columns[column] = 0;
                }
                totals[assignee.name].columns[column] += task.columnSums[column];
            }
        });
    }

    return totals;
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

function displayTotalsInModal() {
    let totals = calculateTotalsByAssignee();
    let modalContent = document.getElementById('modalContent');
    let columns = new Set();
    for (let assignee in totals) {
        for (let column in totals[assignee].columns) {
            columns.add(column);
        }
    }
    let tableHTML = `
<div class="table-container">
    <table class="styled-table">
        <thead>
            <tr>
                <th>Assignees</th>
    `;

    columns.forEach(column => {
        tableHTML += `<th style="padding: 8px;">${column}</th>`;
    });

    tableHTML += `
                </tr>
            </thead>
            <tbody>
    `;

    for (let assignee in totals) {
        let assigneeData = totals[assignee];

        tableHTML += `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                <img src="${assigneeData.avatar}" alt="${assignee}" style="width: 20px; height: 20px; border-radius: 50%; vertical-align: middle; margin-right: 8px;">
                ${assignee}
            </td>`;

        columns.forEach(column => {
            let value = assigneeData.columns[column] || 0;
            tableHTML += `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${value}</td>`;
        });

        tableHTML += `</tr>`;
    }

    tableHTML += `
            </tr>
                    </thead>
                    <tbody>
    `;

    if (Object.keys(totals).length === 0) {
        tableHTML = '<p>No assignees found.</p>';
    }

    modalContent.innerHTML = tableHTML;
    updateButtonText();
}

function closeModal() {
    document.getElementById('totauxModal').style.display = 'none';
}

document.getElementById('openModalBtn').addEventListener('click', () => {
    document.getElementById('totauxModal').style.display = 'flex';
    displayTotalsInModal();
});

document.getElementById('closeModalBtn').addEventListener('click', closeModal);

window.addEventListener('click', (event) => {
    let modal = document.getElementById('totauxModal');
    if (event.target === modal) {
        closeModal();
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        let modal = document.getElementById('totauxModal');
        if (modal.style.display === 'flex') {
            closeModal();
        }
    }
});

function displaySummariesInModal() {
    let columnTotals = calculateTotalsByColumn();
    let summaryContent = document.getElementById('summaryContent');
    summaryContent.innerHTML = '';

    let gridContainer = document.createElement('div');
    gridContainer.className = 'grid-container';

    for (let column in columnTotals) {
        let numericColumns = Object.keys(columnTotals[column][Object.keys(columnTotals[column])[0]]);
        let tableHTML = `<div class="table-container"><table class="styled-table"><thead><tr><th>${column}</th>`;
        numericColumns.forEach(colNum => {
            tableHTML += `<th>${colNum}</th>`;
        });

        tableHTML += `</tr></thead><tbody>`;
        for (let columnValue in columnTotals[column]) {
            tableHTML += `<tr><td>${columnValue}</td>`;
            numericColumns.forEach(colNum => {
                tableHTML += `<td>${columnTotals[column][columnValue][colNum] || 0}</td>`;
            });
            tableHTML += `</tr>`;
        }
        tableHTML += `</tbody></table></div>`;
        gridContainer.innerHTML += tableHTML;
    }

    summaryContent.appendChild(gridContainer);

    if (Object.keys(columnTotals).length === 0) {
        summaryContent.innerHTML = '<p>No data found.</p>';
    }
}

document.getElementById('openSummaryModalBtn').addEventListener('click', () => {
    document.getElementById('summaryModal').style.display = 'flex';
    displaySummariesInModal();
});

document.getElementById('closeSummaryModalBtn').addEventListener('click', () => {
    document.getElementById('summaryModal').style.display = 'none';
});

function closeModals() {
    document.getElementById('totauxModal').style.display = 'none';
    document.getElementById('summaryModal').style.display = 'none';
}

function getTotalTicketsFromDOM() {
    let totalTicketsElement = document.querySelector('span[data-testid="filter-results-count"]');
    if (totalTicketsElement) {
        return parseInt(totalTicketsElement.textContent.trim(), 10);
    }
    return 0;
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

function updateButtonText() {
    let capturedTickets = Object.keys(assignments).length;
    let totalTickets = getTotalTicketsFromDOM();
    let button = document.getElementById('openModalBtn');

    if (capturedTickets !== totalTickets) {
        button.innerText = `Totals - ${capturedTickets}/${totalTickets}`;
    } else {
        button.innerText = `Totals`;
    }

    let gptotsModal = document.getElementById('progress-count');
    gptotsModal.innerText = `${capturedTickets} / ${totalTickets}`;

    updatePercentage(Math.round((capturedTickets / totalTickets) * 100));
}

function calculateTotalsByColumn() {
    let columnTotals = {};
    for (let title in assignments) {
        let task = assignments[title];
        let textColumns = task.textColumns;
        for (let column in textColumns) {
            let columnValue = textColumns[column];
            if (!columnTotals[column]) {
                columnTotals[column] = {};
            }
            if (!columnTotals[column][columnValue]) {
                columnTotals[column][columnValue] = {};
            }
            for (let numericColumn in task.columnSums) {
                if (!columnTotals[column][columnValue][numericColumn]) {
                    columnTotals[column][columnValue][numericColumn] = 0;
                }
                columnTotals[column][columnValue][numericColumn] += task.columnSums[numericColumn];
            }
        }
    }

    return columnTotals;
}

window.addEventListener('click', (event) => {
    let summaryModal = document.getElementById('summaryModal');
    let totalsModal = document.getElementById('totauxModal');
    if ((event.target === summaryModal) || (event.target === totalsModal)) {
        closeModals();
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeModals();
    }
});
