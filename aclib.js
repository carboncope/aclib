class Aclib {
    constructor() {
        this.tests = [];
        this.testResults = [];
        this.createTestTable();
    }

    generateJUnitXML(results) {
        let xml = '<?xml version="1.0" encoding="UTF-8" ?>';
        xml += '<testsuites>';

        for (const result of results) {
            xml += '<testsuite name="' + result.name + '">';
            if (result.status === "passed") {
                xml += '<testcase classname="sample" name="' + result.name + '" time="' + result.time / 1000 + '" />';
            } else if (result.status === "failed") {
                xml += '<testcase classname="sample" name="' + result.name + '" time="' + result.time / 1000 + '">';
                xml += '<failure message="test failure">' + result.message + '</failure>';
                xml += '</testcase>';
            }
            xml += '</testsuite>';
        }
        
        xml += '</testsuites>';
        return xml;
    }
    
    createTestTable() {
        // Create container for the table if it's not already present
        this.container = document.createElement('div');
        document.body.appendChild(this.container);

        // Create an empty table structure
        this.table = document.createElement('table');
        this.table.id = 'tests-table';
        this.table.classList.add('cell-border');
        this.table.style.width = '100%';
        this.container.appendChild(this.table);

        // Initialize the table with DataTables
        this.dataTableApi = $(this.table).DataTable({
            dom: 'Bfrtip', // 'B' for buttons
            buttons: [
                {
                    text: 'Send All Filtered',
                    action: function ( e, dt, node, config ) {
                        // Get filtered rows
                        const filteredRows = dt.rows({ filter: 'applied' }).nodes().to$();
                        
                        // Loop through the filtered rows and click the send-test-btn for each
                        filteredRows.find('.send-test-btn').each(function() {
                            $(this).click();
                        });
                    }
                },
                {
                    text: 'Reset Filters',
                    action: function ( e, dt, node, config ) {
                        dt.columns().every(function () {
                            var column = this;
                            $(column.header()).find('input').val(''); // Clear the input
                            column.search('').draw(); // Reset the search and redraw
                        });
                    }
                },
                {
                    text: 'Save JUnit XML',
                    action: function(e, dt, node, config) {
                        const xml = ac.generateJUnitXML(ac.testResults);
                        const blob = new Blob([xml], { type: 'text/xml' });
                        const url = window.URL.createObjectURL(blob);
                        
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'test-results.xml';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }
                }
            ],
            columns: [
                { title: 'Send', defaultContent: '<button class="send-test-btn">▶</button>' },
                { title: 'TestId' },
                { title: 'Labels' },
                { title: 'Request' },
                { title: 'Passed' },
                { title: 'Failed' }
            ],
            orderCellsTop: true,
            initComplete: function () {
                // Apply the search boxes
                this.api().columns().every(function () {
                    var column = this;
                    var input = $('<input type="text" placeholder="Search..." />')
                        .appendTo($(column.header()))
                        .on('keyup change', function () {
                            if (column.search() !== this.value) {
                                column.search(this.value).draw();
                            }
                        });
                });
            }
        });
        
        // Add the CSS for thead input dynamically after initializing DataTable
        var styleEl = document.createElement('style');
        styleEl.textContent = `
            thead input {
                width: 100%; /* Full width */
                box-sizing: border-box; /* Allow padding to be included in width */
                padding: 2px; /* Some padding */
                margin-bottom: 4px; /* Space out the search box from the column name */
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    // Test object definition
    createTestObject(testid, requestObj, labels, assertions, prerequest, postrequest) {
        let testObj = {
            testid: testid,
            labels: labels || [],
            prerequest: prerequest || (() => {}), 
            postrequest: postrequest || (() => {}), 
            requestObj: requestObj,
            assertions: assertions || [],
            response: null,  // Initialize response property
    
            async parsedBody() {
                if (this.response) {
                    const contentType = this.response.headers.get("Content-Type");
                    if (contentType.includes("json") || contentType.includes("application/vnd")) {
                        return await this.response.json();
                    } else if (contentType.includes("text")) {
                        return await this.response.text();
                    } else if (contentType.includes("xml")) {
                        return await this.response.text();  // XML can be parsed further if required using a library
                    } else {
                        console.error(`Unsupported content type: ${contentType} for test: ${this.testid}`);
                        return null;
                    }
                }
                return null;
            }
        };
    
        if (!testObj.requestObj.headers) { testObj.requestObj.headers = {}; }
        return testObj;
    }

    async processAssertions(test) {
        let passedCount = 0;
        let failedCount = 0;
        let logMessage = "\n\nAssertions:\n";

        for (let assertionFn of test.assertions) {
            let startTime = Date.now(); // Record the start time
            const passed = await assertionFn(test);
            if (passed) {
                logMessage += `Assertion Passed\n`;
                passedCount++;
            } else {
                logMessage += `Assertion Failed\n`;
                failedCount++;
            }
            
            let endTime = Date.now(); // Record the end time
            let durationMillis = endTime - startTime; // Calculate the duration in milliseconds
            let durationSeconds = durationMillis / 1000; // Convert to seconds

            // Store the result in testResults array
            this.testResults.push({
                name: test.testid,
                status: passed ? 'passed' : 'failed',
                time: durationSeconds,
                message: 'TODO fixme add message'
            });
        }
        
        console.log(logMessage); // Or handle the log message as you wish
    
        // Update DataTables with the counts, Target the row directly and update it
        const targetedRow = this.dataTableApi.rows(function (idx, data, node) {
            return data[1] === test.testid;
        }).nodes().to$().closest('tr');

        
        if (targetedRow.length) {
            const rowIndex = targetedRow.index();
            this.dataTableApi.cell(rowIndex, 4).data(passedCount).draw(false);
            this.dataTableApi.cell(rowIndex, 5).data(failedCount).draw(false);

            // After updating the cell data
            this.dataTableApi.cell(rowIndex, 4).nodes().to$().css('background-color', '');
            this.dataTableApi.cell(rowIndex, 5).nodes().to$().css('background-color', '');
            if (passedCount > 0 && failedCount == 0) {
                this.dataTableApi.cell(rowIndex, 4).nodes().to$().css('background-color', 'lightgreen');
            }
            if (failedCount > 0) {
                this.dataTableApi.cell(rowIndex, 5).nodes().to$().css('background-color', 'lightcoral');
            }


            
        } else {
            console.error(`Row with testid ${test.testid} not found!`);
        }


    }
    
    // Test object to table mapper and add
    addToDataTable(test) {
        let testData = [
            `<button class="send-test-btn" data-testid="${test.testid}">▶</button>`, // Send column
            test.testid, // TestId
            test.labels.join(","), // Labels
            `${test.requestObj.method} ${test.requestObj.url}`, // Request
            '0', // Placeholder for 'Passed'
            '0'  // Placeholder for 'Failed'
        ];
    
        this.dataTableApi.row.add(testData).draw(false);
    
        // Check if the event listener has already been attached
        if (!this.eventListenerAttached) {
            // Attach event listener to the table container
            $(this.dataTableApi.table().container()).on('click', (e) => {
                if (e.target && e.target.classList.contains('send-test-btn')) {
                    const testId = e.target.getAttribute('data-testid');
                    const testToExecute = this.tests.find(t => t.testid === testId);
    
                    // Log some test info
                    console.log(`Executing testid[${testToExecute.testid}] `);
    
                    // Call prerequest callback
                    console.log(`  Prerequest`);
                    testToExecute.prerequest(testToExecute);
    
                    // Execute fetch request
                    fetch(testToExecute.requestObj.url, testToExecute.requestObj)
                        .then(response => {
                            // Store the response object in the test object
                            testToExecute.response = response;
                   
                            // Logging request and response details
                            console.log("  Request Headers:", testToExecute.requestObj.headers);
                            console.log("  Request Body:", testToExecute.requestObj.body || "N/A");
    
                            console.log("  Response Headers:", Array.from(response.headers.entries()));
                            console.log("  Response Body:", response || "N/A");
    
                            // Call postrequest callback
                            testToExecute.postrequest(testToExecute);
                            
                            // Process assertions if implemented
                            if(this.processAssertions) {
                                this.processAssertions(testToExecute);
                            }
                        })
                        .catch(error => {
                            console.error("  Fetch failed:", error);
                        });

                    
                }
            });
    
            this.eventListenerAttached = true;
        }
    }

    
    addTest({ testid, requestObj, labels = [], prerequest = () => {}, postrequest = () => {}, assertions = [] }) {
        // Check if testid is already present
        if (this.tests.some(test => test.testid === testid)) {
            console.error(`Test with ID ${testid} already exists.`);
            return; // Exit without adding the test
        }
        
        const test = this.createTestObject(testid, requestObj, labels, assertions, prerequest, postrequest);
        
        this.tests.push(test);
        console.log(`Test with ID ${test.testid} added.`);
        this.addToDataTable(test);
    }
}
