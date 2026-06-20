const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_VAHAN_KEY;
const RAPIDAPI_HOST = "vehicle-registration-db.p.rapidapi.com"; // Adjust if different Vahan endpoint is used

const MOCK_REGISTRATIONS = {
  "GJ01AB1234": {
    model_name: "Honda Activa 6G",
    vehicle_type: "scooter",
    color: "#1a3c6e", // Deep Blue
    owner_name: "Yash Kukreja",
    registration_date: "12-01-2023",
    fuel_type: "Petrol",
    chassis_number: "ME4JF543*********",
    engine_number: "JF54E**********",
    puc_expiry_date: "2026-06-26",
    insurance_expiry_date: "2026-12-20",
    current_odometer: 12450
  },
  "MH12AB1234": {
    model_name: "Honda Activa 6G",
    vehicle_type: "scooter",
    color: "#1a3c6e", // Deep Blue
    owner_name: "Yash Kukreja",
    registration_date: "12-01-2023",
    fuel_type: "Petrol",
    chassis_number: "ME4JF543*********",
    engine_number: "JF54E**********",
    puc_expiry_date: "2026-06-26",
    insurance_expiry_date: "2026-12-20",
    current_odometer: 12450
  },
  "MH14XY9876": {
    model_name: "Maruti Swift LXi",
    vehicle_type: "car",
    color: "#ba1a1a", // Red
    owner_name: "Kishore Kukreja",
    registration_date: "20-05-2018",
    fuel_type: "Petrol",
    chassis_number: "MA3EY763*********",
    engine_number: "K12M**********",
    puc_expiry_date: "2026-11-15",
    insurance_expiry_date: "2026-06-18",
    current_odometer: 48900
  }
};

/**
 * Fetches vehicle RTO details for a given registration plate number.
 * Supports standard Indian formats e.g. GJ 01 AB 1234 or MH12AB1234.
 */
export async function fetchVehicleDetails(regNumber) {
  // Normalize plate number (remove spaces and keep uppercase)
  const normalizedPlate = regNumber.toUpperCase().replace(/\s+/g, "");
  
  console.log("Looking up vehicle registration number:", normalizedPlate);

  // If RapidAPI key is not present, return unavailable status immediately
  if (!RAPIDAPI_KEY) {
    return { 
      success: false, 
      error: "RTO database lookup is currently unavailable. Please add details manually." 
    };
  }

  // Real RapidAPI call
  try {
    const url = `https://${RAPIDAPI_HOST}/vehicle?registrationNumber=${normalizedPlate}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST
      }
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const json = await response.json();
    
    // Normalize properties from the specific API response shape to our unified schema
    return {
      success: true,
      data: {
        model_name: json.model || json.make_model || "Unknown Vehicle",
        vehicle_type: (json.class && json.class.toLowerCase().includes("car")) ? "car" : "scooter",
        color: json.color || "#000000",
        owner_name: json.owner || "Registered Owner",
        registration_date: json.registration_date || "01-01-2023",
        fuel_type: json.fuel_type || "Petrol",
        chassis_number: json.chassis || "N/A",
        engine_number: json.engine || "N/A",
        puc_expiry_date: json.puc_upto || null,
        insurance_expiry_date: json.insurance_upto || null,
        current_odometer: 1000 // default placeholder for fetched items
      }
    };
  } catch (error) {
    console.error("Vahan API Error:", error);
    return { 
      success: false, 
      error: "RTO database lookup is currently unavailable. Please add details manually." 
    };
  }
}
export default fetchVehicleDetails;
