/**
 * 
 * @param {*} location 
 * @param {*} song 
 * @param {*} date 
 * @param {*} time 
 */

async function add_pin(location,song,date,time) {
    /** Create a new instance of a pin */

    try {
        const pinData = {
            location,
            song,
            date,
            time
        };

    /** Adds pin to the database asasdd */
        {
        const response = await fetch('/api/pins/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pinData)
        });

        if (!response.ok) {
            throw new Error(`Failed to create pin: ${response.statusText}`);
        }

        const result = await response.json();

        console.log("Pin created successfully:", result);
        } 
    
    } catch (error) {
        console.error("Error sending pin to backend:", error.message);
    }
}

