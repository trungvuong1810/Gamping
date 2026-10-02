import { Trip, TripMember, Group, EquipmentItem, FoodItem, WeatherForecastDay } from '../types';

export interface SheetSyncPayload {
  trip: Trip;
  members: TripMember[];
  groups: Group[];
  equipment: EquipmentItem[];
  food: FoodItem[];
  weather?: {
    forecastDays: WeatherForecastDay[];
    summary?: string;
  };
}

/**
 * Extracts a Google Spreadsheet ID from either a raw ID or a full Google Sheets URL.
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Check if it's a URL
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Otherwise assume it's the raw ID
  return trimmed;
}

/**
 * Creates a brand new camping trip Google Spreadsheet with pre-formatted sheets.
 */
export async function createCampingSpreadsheet(
  accessToken: string,
  tripTitle: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const requestBody = {
    properties: {
      title: `🏕️ ${tripTitle} - Camping Trip Planner`,
      locale: 'en_US',
      autoRecalc: 'ON_CHANGE'
    },
    sheets: [
      {
        properties: {
          title: '📋 Trip Overview',
          gridProperties: { rowCount: 50, columnCount: 10, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: '👥 Groups & Members',
          gridProperties: { rowCount: 100, columnCount: 10, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: '🎒 Gear & Equipment',
          gridProperties: { rowCount: 200, columnCount: 10, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: '🍳 Menu & Food',
          gridProperties: { rowCount: 150, columnCount: 10, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: '⛅ Weather Forecast',
          gridProperties: { rowCount: 50, columnCount: 10, frozenRowCount: 1 }
        }
      }
    ]
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Google Spreadsheet: ${errorText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Pushes complete camping trip details, groups, members, gear, menu, and weather into Google Sheets.
 */
export async function pushTripDataToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  payload: SheetSyncPayload
): Promise<boolean> {
  const { trip, members, groups, equipment, food, weather } = payload;
  const groupMap = new Map<string, string>();
  groups.forEach((g) => groupMap.set(g.id, g.name));

  // 1. Prepare Trip Overview data
  const overviewValues = [
    ['Property', 'Details', 'Notes / Status'],
    ['Trip Name', trip.title, 'Campground Expedition'],
    ['Destination', trip.location || 'Camping Grounds', 'Coordinates: ' + (trip.parkDetails ? `${trip.parkDetails.location}` : 'Planned')],
    ['Departure Date', trip.startDate, 'Arrival day'],
    ['Return Date', trip.endDate, 'Departure day'],
    ['Total Campers', members.length.toString(), `${groups.length} Groups Assigned`],
    ['Organizer / Host', trip.hostName || 'Organizer', trip.hostEmail || ''],
    ['Last Synced', new Date().toLocaleString(), 'Real-Time Sync Active'],
    ['App Sync Status', 'Connected & Synchronized', 'All devices synchronized']
  ];

  // 2. Prepare Groups & Members data
  const memberValues = [
    ['Group Name', 'Camper Name', 'Email', 'Role', 'Status']
  ];
  if (groups.length === 0 && members.length === 0) {
    memberValues.push(['General Camp', 'Trip Organizer', 'host@camp.local', 'Host', 'Active']);
  } else {
    members.forEach((m) => {
      // Find group for member
      const memberGroup = groups.find((g) => g.id === (m as any).groupId) || groups[0];
      memberValues.push([
        memberGroup?.name || 'General Campers',
        m.name,
        m.email,
        m.role === 'host' ? 'Trip Host / Organizer' : 'Camper',
        'Confirmed'
      ]);
    });
  }

  // 3. Prepare Gear & Equipment data
  const gearValues = [
    ['Item Name', 'Group Responsible', 'Category', 'Packed Status', 'Assigned Camper', 'Qty', 'Notes', 'AI Suggested']
  ];
  if (equipment.length === 0) {
    gearValues.push(['4-Person Tent', 'Group Alpha', 'Shelter & Sleep', 'Needed', 'Unassigned', '1', 'Check rainfly & stakes', 'No']);
  } else {
    equipment.forEach((item) => {
      const gName = groupMap.get(item.groupId) || 'All Campers';
      gearValues.push([
        item.name,
        gName,
        item.category || 'General',
        item.packed ? 'PACKED ✅' : 'NEEDED ⏳',
        item.assignedTo || 'Unassigned',
        '1',
        item.notes || '',
        item.aiSuggested ? 'Grok AI' : 'Manual'
      ]);
    });
  }

  // 4. Prepare Menu & Food data
  const foodValues = [
    ['Meal Time / Day', 'Meal Title', 'Group Responsible', 'Lead Cook', 'Ingredients & Needed Items', 'Storage Method', 'Status']
  ];
  if (food.length === 0) {
    foodValues.push(['Dinner - Night 1', 'Cast Iron Steak & Potatoes', 'Group Beta', 'Camp Chef', 'Steak, potatoes, butter, garlic', 'Cooler (Ice)', 'Planned']);
  } else {
    food.forEach((f) => {
      const gName = groupMap.get(f.groupId) || 'Group';
      foodValues.push([
        `${f.dayLabel || 'Day 1'} - ${(f.mealTime || 'Meal').toUpperCase()}`,
        f.title,
        gName,
        f.cookOrBringer || 'Campers',
        f.ingredientsOrItems || '',
        f.description || 'Cooler / Dry Box',
        (f.status || 'planned').toUpperCase()
      ]);
    });
  }

  // 5. Prepare Weather Forecast data
  const weatherValues = [
    ['Date', 'Day', 'Condition', 'High Temp (°F / °C)', 'Low Temp (°F / °C)', 'Rain Chance %', 'Wind (mph)', 'UV Index', 'Camping Advisory']
  ];
  if (weather && weather.forecastDays && weather.forecastDays.length > 0) {
    weather.forecastDays.forEach((w) => {
      weatherValues.push([
        w.date,
        w.dayName,
        w.condition,
        `${w.maxTempF}°F / ${w.maxTempC}°C`,
        `${w.minTempF}°F / ${w.minTempC}°C`,
        `${w.precipitationPercent}%`,
        `${w.windSpeedMph} mph`,
        w.uvIndex.toString(),
        w.advisory || 'Standard camping conditions'
      ]);
    });
  } else {
    weatherValues.push([
      new Date().toISOString().split('T')[0],
      'Today',
      'Mild & Clear',
      '72°F / 22°C',
      '50°F / 10°C',
      '10%',
      '5 mph',
      '4',
      'Pack standard layered clothing & dry weather sleeping gear'
    ]);
  }

  // Execute batch update to write values to all sheets
  const updateData = [
    { range: "'📋 Trip Overview'!A1:C20", values: overviewValues },
    { range: "'👥 Groups & Members'!A1:E100", values: memberValues },
    { range: "'🎒 Gear & Equipment'!A1:H200", values: gearValues },
    { range: "'🍳 Menu & Food'!A1:G150", values: foodValues },
    { range: "'⛅ Weather Forecast'!A1:I50", values: weatherValues }
  ];

  const batchResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updateData
      })
    }
  );

  if (!batchResponse.ok) {
    // If sheet names are default Sheet1, fallback to Sheet1 range
    const errorText = await batchResponse.text();
    console.warn('Batch update with custom tab names failed, trying single sheet fallback:', errorText);

    const fallbackResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:H200?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [
            ['CAMPING TRIP PLANNER', trip.title, '', '', '', '', '', ''],
            ['Destination:', trip.location, 'Dates:', `${trip.startDate} to ${trip.endDate}`, '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['--- GEAR & EQUIPMENT LIST ---', '', '', '', '', '', '', ''],
            ...gearValues,
            ['', '', '', '', '', '', '', ''],
            ['--- MENU & FOOD CONTRIBUTIONS ---', '', '', '', '', '', '', ''],
            ...foodValues
          ]
        })
      }
    );

    return fallbackResponse.ok;
  }

  return true;
}

/**
 * Pulls current gear status from Google Sheets to sync changes back into the application.
 */
export async function pullGearFromSpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Array<{ name: string; packed: boolean; assignedTo?: string; notes?: string }>> {
  try {
    const range = "'🎒 Gear & Equipment'!A2:H200";
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    const rows = json.values || [];
    const items: Array<{ name: string; packed: boolean; assignedTo?: string; notes?: string }> = [];

    for (const row of rows) {
      if (!row || !row[0]) continue;
      const name = row[0].toString().trim();
      const statusText = (row[3] || '').toString().toLowerCase();
      const packed = statusText.includes('packed') || statusText.includes('yes') || statusText.includes('done');
      const assignedTo = row[4] ? row[4].toString().trim() : undefined;
      const notes = row[6] ? row[6].toString().trim() : undefined;

      items.push({ name, packed, assignedTo, notes });
    }

    return items;
  } catch (err) {
    console.error('Error reading gear from spreadsheet:', err);
    return [];
  }
}
