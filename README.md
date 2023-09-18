# aclib
Automation API helper lib that provides javascript fetch capabilities wrapper. I micro replacement for postman due to the sep 15th scratchpad deadline.

## Example HTML

Below is the example HTML code:

```html
<!DOCTYPE html>
<html>
<head>
<title>API Tester</title>
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.10.20/css/jquery.dataTables.min.css">
    <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
    <script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>   
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/buttons/1.7.1/css/buttons.dataTables.min.css">
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/1.7.1/js/dataTables.buttons.min.js"></script>
    <script src="https://carboncope.github.io/aclib/aclib.js"></script>
</head>
<body>
<script>

const ac = new Aclib();

// localStorage variables example (Cross html page testing with shared base_url)- Check if base_url exists in localStorage; if not, set it
if (!localStorage.getItem("base_url")) {
    localStorage.setItem("base_url", "https://reqres.in");
}

ac.addTest({
    testid: "JIRA-1234",
    requestObj: { url: `${localStorage.getItem("base_url")}/api/users/2`, method: 'GET' },
    labels: ["JIRA-1234", "getlabel"],
    prerequest: (test) => {
        console.log(`  Callback before the request... ${test.testid}`);
        test.requestObj.headers['CorrelationId'] = 'someUniqueId';
    },
    postrequest: (test) => { console.log("  Callback after the request..."); },
    assertions: [
        async (test) => { 
            return test.response.status === 200;
        },
        async (test) => { 
            const responseBody = await test.parsedBody();
            return responseBody?.data?.id === 1;
        }
    ]
});


// Make sure there's a default SOAP base URL in localStorage
if (!localStorage.getItem("soap_base_url")) {
    localStorage.setItem("soap_base_url", "https://reqbin.com");
}
ac.addTest({
    testid: "JIRA-1235",
    requestObj: {
        url: `${localStorage.getItem("soap_base_url")}/echo/post/xml`,
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml',
            'CorrelId': 'FIXME'
        },
        body: `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
                <soapenv:Body>
                    <Request>
                        <Login>login</Login>
                        <Password>password</Password>
                    </Request>
                </soapenv:Body>
            </soapenv:Envelope>
        `
    },
    labels: ["JIRA-1235", "soaplabel"],
    prerequest: (test) => {
        console.log(`  Callback before the request... ${test.testid}`);
        test.requestObj.headers['CorrelationId'] = 'someUniqueId';
    },
    postrequest: (test) => { console.log("  Callback after the request..."); },
    assertions: [
        async (test) => {
            const responseBody = await test.parsedBody();
            let parser = new DOMParser();
            let xmlDoc = parser.parseFromString(responseBody, "text/xml");
            let result = xmlDoc.querySelector("ResponseMessage").textContent;
            return result === "Success";
        }
    ]
});

    
</script>
</body>    
</html>
```
