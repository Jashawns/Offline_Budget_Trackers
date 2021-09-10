let db;
let budgetTrackerVersion;

// Create a new db request for a "BudgetTrackerDB" database version 1. Returns a request for a database because IndexedDB is an asynchronous API.
const request = indexedDB.open('BudgetTrackerDB', budgetTrackerVersion || 1);

request.onuploadneeded = function (e) {
  console.log('Upload needed in IndexDB');

  const { oldVersion } = e;
  const newVersion = e.newVersion || db.version;

  console.log(`DB Updated from version ${oldVersion} to ${newVersion}`);
  // we set the variable db to hold our database
  db = e.target.result;

  if (db.objectStoreTransactions.length === 0) {
    db.createObjectStore('BudgetTransStore', { autoIncrement: true });
  }
};
// on error alert
request.onerror = function (e) {
  console.log(`Nope! ${e.target.errorCode}`);
};

function checkDatabase() {
  console.log('check db invoked');

  // Open a transaction on your BudgetStore db
  let transaction = db.transaction(['BudgetTransStore'], 'readwrite');

  // access your BudgetStore object
  const store = transaction.objectStore('BudgetTransStore');

  // Get all records from store and set to a variable
  const getAll = store.getAll();

  // If the request was successful
  getAll.onsuccess = function () {
    // If there are items in the store, we need to bulk add them when we are back online
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((res) => {
          // If our returned response is not empty
          if (res.length !== 0) {
            // Open another transaction to BudgetStore with the ability to read and write
            transaction = db.transaction(['BudgetTransStore'], 'readwrite');

            // Assign the current store to a variable
            const currentTransStore = transaction.objectStore('BudgetTransStore');

            // Clear existing entries because our bulk add was successful
            currentTransStore.clear();
            console.log('Clearing transactions 🧹');
          }
        });
    }
  };
}

request.onsuccess = function (e) {
  console.log('success');
  db = e.target.result;

  // Check if app is online before reading from db
  if (navigator.onLine) {
    console.log('Backend online! 🗄️');
    checkDatabase();
  }
};

const saveRecord = (record) => {
  console.log('Save record invoked');
  // Create a transaction on the BudgetTransStore db with readwrite access
  const transaction = db.transaction(['BudgetTransStore'], 'readwrite');

  // Access your BudgetStore object store
  const store = transaction.objectStore('BudgetTransStore');

  // Add record to your store with add method.
  store.add(record);
};

// Listen for app coming back online
window.addEventListener('online', checkDatabase);
