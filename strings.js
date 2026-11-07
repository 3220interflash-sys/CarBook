'use strict';
/* CarBook: every word the app shows lives here.
   To translate: copy the `en` block into `si` or `ta` and translate the text.
   Anything missing falls back to English, so a translation can be done bit by bit.
   Entries written as `(x) => ...` fill in numbers or names; keep the ${...} parts as they are.
   Stored values (like 'Oil change' or 'Petrol') never change. Only their labels here do. */

const STRINGS = {
  en: {
    langName: 'English',
    appName: 'CarBook',

    // general
    close: 'Close',
    save: 'Save',
    delete: 'Delete',
    saved: 'Saved',
    deleted: 'Deleted',
    cancel: 'Cancel',
    confirmDeleteTitle: 'Delete this record?',
    confirmDelete: 'This cannot be undone.',
    couldNotSave: 'Could not save. Please try again.',
    storageFull: 'Storage is full. Export your data from the Today tab.',
    km: 'km',
    rs: n => `Rs ${n}`,
    update: 'Update',
    add: 'Add',
    notRecorded: 'Not recorded',
    history: 'History',
    optional: label => `${label} (optional)`,
    photoOptional: 'Photo (optional)',
    photoReplace: 'Photo (replace)',
    attachedPhoto: 'Attached photo',

    // tabs
    tabToday: 'Today',
    tabFuel: 'Fuel',
    tabService: 'Service',
    tabAsk: 'Ask',
    mainNav: 'Main',

    // document kinds
    kind_emission: 'Emission test',
    kind_insurance: 'Insurance',
    kind_revenue: 'Revenue licence',
    kind_driving: 'Driving licence',
    kind_warranty: 'Warranty',
    kind_other: 'Other document',
    hint_emission: 'Book this first. It is needed to renew your revenue licence.',
    hint_insurance: 'Needed to renew your revenue licence.',
    hint_revenue: 'Needs a valid emission test and insurance.',

    // vehicle types and fuels
    'type_Car': 'Car',
    'type_Motorbike': 'Motorbike',
    'type_Three-wheeler': 'Three-wheeler',
    'type_Van': 'Van',
    'fuel_Petrol': 'Petrol',
    'fuel_Diesel': 'Diesel',
    'fuel_Hybrid': 'Hybrid',
    'fuel_Electric': 'Electric',

    // service kinds and parts
    'svc_Oil change': 'Oil change',
    'svc_Brake pads': 'Brake pads',
    'svc_Tyres': 'Tyres',
    'svc_Battery': 'Battery',
    'svc_Spark plugs': 'Spark plugs',
    'svc_Other': 'Other',
    'part_Genuine': 'Genuine',
    'part_Aftermarket': 'Aftermarket',
    'part_Used': 'Used',
    'filter_Changed': 'Changed',
    'filter_Not changed': 'Not changed',

    // status
    overdueBy: n => `Overdue by ${n} ${n === 1 ? 'day' : 'days'}`,
    today: 'Today',
    dueToday: 'Due today',
    inTime: x => `In ${x}`,
    days: n => `${n} ${n === 1 ? 'day' : 'days'}`,
    months: n => `${n} months`,

    // condition
    engineOil: 'Engine oil',
    noRecordYet: 'No record yet',
    oilDueNow: 'Change due now',
    oilNext: (km, date) => `Next change in ${km} km or by ${date}`,
    batteryAge: y => `${y} years old`,
    batteryLoadTest: 'Ask for a load test.',
    kmSince: km => `${km} km since last done`,
    actBrakes: 'Check pad thickness.',
    actTyres: 'Check tread and age.',
    actPlugs: 'Ask about replacing.',

    // vehicle form
    addVehicleTitle: 'Add a vehicle',
    editVehicleTitle: 'Edit vehicle',
    vName: 'Name',
    vNamePh: 'e.g. Suzuki Wagon R',
    plate: 'Plate number',
    year: 'Year',
    type: 'Type',
    fuel: 'Fuel',
    odometer: 'Odometer (km)',
    exemptHelp: 'Electric and hybrid vehicles are currently exempt from the annual emission test, so it is left off their checklist.',
    errOdo: 'Enter the odometer reading.',
    addVehicleBtn: 'Add vehicle',

    // document form
    addDocTitle: 'Add a document',
    editDocTitle: 'Edit document',
    docName: 'Name (optional)',
    docNamePh: 'e.g. Battery warranty',
    expiresOn: 'Expires on',
    note: 'Note (optional)',
    docNotePh: 'Policy number, provider, anything useful',
    errExpiry: 'Choose the expiry date.',
    previousExpiries: list => `Earlier expiry dates: ${list}`,

    // renew form
    renewedTitle: name => `Renewed ${name}`,
    newExpiry: 'New expiry date',
    renewHelp: 'The old expiry date is kept in this document’s history. Edit the document to attach a new photo.',
    errNewExpiry: 'Choose the new expiry date.',
    saveRenewal: 'Save renewal',

    // fuel form
    addFuelTitle: 'Log a fill-up',
    editFuelTitle: 'Edit fill-up',
    litres: 'Litres',
    totalRs: 'Total (Rs)',
    date: 'Date',
    fuelPhotoHelp: 'Photograph the pump display or receipt. Reading numbers from photos automatically is planned. For now, type them in.',
    errFuel: 'Enter litres, total and odometer.',

    // service form
    addServiceTitle: 'Add a service',
    editServiceTitle: 'Edit service',
    whatDone: 'What was done',
    oilType: 'Oil type and grade',
    oilTypePh: 'e.g. 10W-40 semi-synthetic',
    oilFilter: 'Oil filter',
    costRs: 'Cost (Rs)',
    garage: 'Garage',
    partsUsed: 'Parts used',

    // odometer form
    updateOdoTitle: 'Update odometer',
    odoHelp: 'A fresh reading keeps service reminders accurate.',
    errReading: 'Enter the reading.',
    errLower: km => `That is lower than the last reading (${km} km).`,

    // vehicle switcher
    yourVehicles: 'Your vehicles',
    selected: 'Selected',
    editThisVehicle: 'Edit this vehicle',
    addAVehicle: 'Add a vehicle',
    switchVehicle: 'Switch or edit vehicle',
    hiMorning: 'Good morning',
    hiAfternoon: 'Good afternoon',
    hiEvening: 'Good evening',

    // onboarding
    tagline: 'Every deadline, service and receipt for your vehicle, sorted in one place.',
    addYourVehicle: 'Add your vehicle',
    onDevice: 'Your records stay on this device. You can export them any time.',
    tryExample: 'Try it with an example vehicle',
    exampleName: 'Example car',
    exampleGarage: 'Example garage',

    // today
    startDocs: 'Start with your documents',
    startDocsWhy: 'Add the expiry dates below and CarBook shows what is due next.',
    docsAndDeadlines: 'Documents and deadlines',
    notAddedYet: 'Not added yet',
    markRenewed: name => `Mark ${name.toLowerCase()} renewed`,
    addADocument: 'Add a document',
    runningCosts: 'Running costs',
    kplAvg: 'km per litre, average',
    fuel30: 'fuel in the last 30 days',
    yourData: 'Your data',
    dataNote: 'Stored on this device. Photos are not included in exports.',
    export: 'Export',
    import: 'Import',
    exported: 'Exported',
    imported: 'Imported',
    confirmImportTitle: 'Replace your data?',
    confirmImport: 'The records on this device will be replaced with the ones in this file.',
    replace: 'Replace',
    notExport: 'That file is not a CarBook export.',
    language: 'Language',
    privacyPolicy: 'Privacy policy',

    // fuel
    avgPrice: 'average price per litre',
    litresShort: n => `${n} L`,
    kpl: n => `${n} km/L`,
    firstEntry: 'First entry',
    photo: 'photo',
    fillAssumption: 'Fuel economy assumes you fill the tank each time.',
    noFuelTitle: 'No fill-ups yet',
    noFuelText: 'Log your next fill-up. Two or more entries show how far you get per litre.',

    // service
    condition: 'Condition',
    defaultIntervals: 'Default intervals. Your owner’s manual comes first.',
    filterState: s => `filter ${s.toLowerCase()}`,
    noServiceTitle: 'No services recorded',
    noServiceText: 'Add past services with approximate dates. A fuller history gives better questions for your mechanic.',

    // ask
    askTitle: 'Before you visit the garage',
    askIntro: 'Get questions to ask your mechanic, based on your own records.',
    prepare: 'Prepare my questions',
    basedOn: x => `Based on: ${x}`,
    normalSize: 'Normal size',
    showMechanic: 'Show to mechanic',
    askDisclaimer: 'These questions come from simple rules. They suggest what to ask and never diagnose. Smarter, plain-language questions in Sinhala, Tamil and English are planned.',

    // ask: questions and what they are based on
    qOil: (km, oil) => `Your last oil change was ${km} km ago${oil ? ' (' + oil + ')' : ''}. Ask them to check the oil level and condition.`,
    bOil: (date, km) => `Oil change on ${date} at ${km} km`,
    qNoOil: 'There is no oil change on record. Ask what oil is in the engine and when it was last changed.',
    bNoOil: 'No oil change logged',
    qOilType: oil => `Ask them to confirm they use ${oil}, or what your manual recommends if it differs.`,
    bOilType: 'Oil type from your last change',
    qBrakes: km => `Brake pads were last done at ${km} km. Ask them to measure the pad thickness.`,
    bLog: 'Your service log',
    qNoBrakes: 'There is no brake pad record. Ask for a measured pad thickness before agreeing to replace anything.',
    bNoBrakes: 'No brake service logged',
    qBattery: y => `The battery is about ${y} years old. Ask for a battery load test.`,
    bBattery: date => `Battery fitted ${date}`,
    qNoTyres: 'There is no tyre record. Ask about tread depth and tyre age (the date code on the sidewall).',
    bNoTyres: 'No tyre service logged',
    qFuel: (rec, old) => `Fuel use has worsened lately (${rec} km/L, down from ${old}). Ask about the air filter, spark plugs and tyre pressure.`,
    bFuel: 'Your last fill-ups',
    qEmission: n => `Your emission test expires in ${n} days. Ask whether anything on the car could cause a fail, and fix it first.`,
    bEmission: date => `Emission test expires ${date}`,
    qEmpty: 'You have no service history here yet. Ask the garage for a written list of everything they do today, with parts used, and add it to the Service tab.',
    bEmpty: 'Empty service history'
  },

  // Sinhala. Add translated entries here. Missing ones show in English.
  si: {},

  // Tamil. Add translated entries here. Missing ones show in English.
  ta: {}
};

// Locale used for dates and numbers in each language.
const LOCALES = { en: 'en-GB', si: 'si-LK', ta: 'ta-LK' };
