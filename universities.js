// uniVERSE — Nigerian universities dataset
// Used by the searchable school picker on /register (and later,
// campus-specific grouping/feeds — e.g. "ASF UNIBEN", "UNILAG Fellowship").
//
// Fields:
//   id     — unique slug, stored as the school value on the profile
//   name   — full official name
//   short  — common abbreviation
//   state  — Nigerian state the campus is in
//   type   — federal | state | private
//   region — geopolitical zone, derived from state
//            (south-south, south-west, south-east, north-central, north-west, north-east)

const UNIVERSITIES = [
  { id: "uniben", name: "University of Benin", short: "UNIBEN", state: "Edo", type: "federal", region: "south-south" },
  { id: "unilag", name: "University of Lagos", short: "UNILAG", state: "Lagos", type: "federal", region: "south-west" },
  { id: "ui", name: "University of Ibadan", short: "UI", state: "Oyo", type: "federal", region: "south-west" },
  { id: "unn", name: "University of Nigeria, Nsukka", short: "UNN", state: "Enugu", type: "federal", region: "south-east" },
  { id: "abu", name: "Ahmadu Bello University", short: "ABU", state: "Kaduna", type: "federal", region: "north-west" },
  { id: "oau", name: "Obafemi Awolowo University", short: "OAU", state: "Osun", type: "federal", region: "south-west" },
  { id: "unilorin", name: "University of Ilorin", short: "UNILORIN", state: "Kwara", type: "federal", region: "north-central" },
  { id: "uniport", name: "University of Port Harcourt", short: "UNIPORT", state: "Rivers", type: "federal", region: "south-south" },
  { id: "unical", name: "University of Calabar", short: "UNICAL", state: "Cross River", type: "federal", region: "south-south" },
  { id: "uniabuja", name: "University of Abuja", short: "UNIABUJA", state: "FCT", type: "federal", region: "north-central" },
  { id: "unijos", name: "University of Jos", short: "UNIJOS", state: "Plateau", type: "federal", region: "north-central" },
  { id: "unimaid", name: "University of Maiduguri", short: "UNIMAID", state: "Borno", type: "federal", region: "north-east" },
  { id: "uniuyo", name: "University of Uyo", short: "UNIUYO", state: "Akwa Ibom", type: "federal", region: "south-south" },
  { id: "udus", name: "Usmanu Danfodiyo University", short: "UDUS", state: "Sokoto", type: "federal", region: "north-west" },
  { id: "buk", name: "Bayero University", short: "BUK", state: "Kano", type: "federal", region: "north-west" },
  { id: "atbu", name: "Abubakar Tafawa Balewa University", short: "ATBU", state: "Bauchi", type: "federal", region: "north-east" },
  { id: "futo", name: "Federal University of Technology Owerri", short: "FUTO", state: "Imo", type: "federal", region: "south-east" },
  { id: "futa", name: "Federal University of Technology Akure", short: "FUTA", state: "Ondo", type: "federal", region: "south-west" },
  { id: "futminna", name: "Federal University of Technology Minna", short: "FUTMINNA", state: "Niger", type: "federal", region: "north-central" },
  { id: "fudutse", name: "Federal University Dutse", short: "FUD", state: "Jigawa", type: "federal", region: "north-west" },
  { id: "fudma", name: "Federal University Dutsin-Ma", short: "FUDMA", state: "Katsina", type: "federal", region: "north-west" },
  { id: "fugashua", name: "Federal University Gashua", short: "FUGA", state: "Yobe", type: "federal", region: "north-east" },
  { id: "fupre", name: "Federal University of Petroleum Resources", short: "FUPRE", state: "Delta", type: "federal", region: "south-south" },
  { id: "unaab", name: "Federal University of Agriculture Abeokuta", short: "FUNAAB", state: "Ogun", type: "federal", region: "south-west" },
  { id: "uam", name: "Joseph Sarwuan Tarka University", short: "UAM", state: "Benue", type: "federal", region: "north-central" },
  { id: "nou", name: "National Open University of Nigeria", short: "NOUN", state: "FCT", type: "federal", region: "north-central" },
  { id: "unizik", name: "Nnamdi Azikiwe University", short: "UNIZIK", state: "Anambra", type: "federal", region: "south-east" },
  { id: "federal_lafia", name: "Federal University Lafia", short: "FULAFIA", state: "Nasarawa", type: "federal", region: "north-central" },
  { id: "federal_kashere", name: "Federal University Kashere", short: "FUK", state: "Gombe", type: "federal", region: "north-east" },
  { id: "federal_oye", name: "Federal University Oye-Ekiti", short: "FUOYE", state: "Ekiti", type: "federal", region: "south-west" },

  { id: "lasu", name: "Lagos State University", short: "LASU", state: "Lagos", type: "state", region: "south-west" },
  { id: "delsu", name: "Delta State University", short: "DELSU", state: "Delta", type: "state", region: "south-south" },
  { id: "aauekpoma", name: "Ambrose Alli University", short: "AAU", state: "Edo", type: "state", region: "south-south" },
  { id: "eksu", name: "Ekiti State University", short: "EKSU", state: "Ekiti", type: "state", region: "south-west" },
  { id: "rsu", name: "Rivers State University", short: "RSU", state: "Rivers", type: "state", region: "south-south" },
  { id: "ksu", name: "Kogi State University", short: "KSU", state: "Kogi", type: "state", region: "north-central" },
  { id: "bsum", name: "Benue State University", short: "BSU", state: "Benue", type: "state", region: "north-central" },
  { id: "imsu", name: "Imo State University", short: "IMSU", state: "Imo", type: "state", region: "south-east" },
  { id: "absu", name: "Abia State University", short: "ABSU", state: "Abia", type: "state", region: "south-east" },
  { id: "adsu", name: "Adamawa State University", short: "ADSU", state: "Adamawa", type: "state", region: "north-east" },

  { id: "aaua", name: "Adekunle Ajasin University", short: "AAUA", state: "Ondo", type: "state", region: "south-west" },
  { id: "aksu", name: "Akwa Ibom State University", short: "AKSU", state: "Akwa Ibom", type: "state", region: "south-south" },
  { id: "basug", name: "Bauchi State University", short: "BASUG", state: "Bauchi", type: "state", region: "north-east" },
  { id: "crutech", name: "Cross River University of Technology", short: "CRUTECH", state: "Cross River", type: "state", region: "south-south" },
  { id: "ebsu", name: "Ebonyi State University", short: "EBSU", state: "Ebonyi", type: "state", region: "south-east" },
  { id: "esut", name: "Enugu State University of Science and Technology", short: "ESUT", state: "Enugu", type: "state", region: "south-east" },
  { id: "ksust", name: "Kano University of Science and Technology", short: "KUST", state: "Kano", type: "state", region: "north-west" },
  { id: "kasu", name: "Kaduna State University", short: "KASU", state: "Kaduna", type: "state", region: "north-west" },
  { id: "kwasu", name: "Kwara State University", short: "KWASU", state: "Kwara", type: "state", region: "north-central" },
  { id: "ndu", name: "Niger Delta University", short: "NDU", state: "Bayelsa", type: "state", region: "south-south" },

  { id: "oou", name: "Olabisi Onabanjo University", short: "OOU", state: "Ogun", type: "state", region: "south-west" },
  { id: "osun", name: "Osun State University", short: "UNIOSUN", state: "Osun", type: "state", region: "south-west" },
  { id: "tasu", name: "Taraba State University", short: "TASU", state: "Taraba", type: "state", region: "north-east" },
  { id: "ysu", name: "Yobe State University", short: "YSU", state: "Yobe", type: "state", region: "north-east" },
  { id: "umyu", name: "Umaru Musa Yar'adua University", short: "UMYU", state: "Katsina", type: "state", region: "north-west" },
  { id: "gsu", name: "Gombe State University", short: "GSU", state: "Gombe", type: "state", region: "north-east" },
  { id: "ibbu", name: "Ibrahim Badamasi Babangida University", short: "IBBU", state: "Niger", type: "state", region: "north-central" },
  { id: "iaue", name: "Ignatius Ajuru University of Education", short: "IAUE", state: "Rivers", type: "state", region: "south-south" },
  { id: "edostate", name: "Edo State University Uzairue", short: "EDSU", state: "Edo", type: "state", region: "south-south" },
  { id: "coou", name: "Chukwuemeka Odumegwu Ojukwu University", short: "COOU", state: "Anambra", type: "state", region: "south-east" },

  { id: "covenant", name: "Covenant University", short: "CU", state: "Ogun", type: "private", region: "south-west" },
  { id: "babcock", name: "Babcock University", short: "BU", state: "Ogun", type: "private", region: "south-west" },
  { id: "aun", name: "American University of Nigeria", short: "AUN", state: "Adamawa", type: "private", region: "north-east" },
  { id: "abuad", name: "Afe Babalola University", short: "ABUAD", state: "Ekiti", type: "private", region: "south-west" },
  { id: "bowen", name: "Bowen University", short: "BOWEN", state: "Osun", type: "private", region: "south-west" },
  { id: "redeemers", name: "Redeemer's University", short: "RUN", state: "Osun", type: "private", region: "south-west" },
  { id: "benson", name: "Benson Idahosa University", short: "BIU", state: "Edo", type: "private", region: "south-south" },
  { id: "madonna", name: "Madonna University", short: "MU", state: "Anambra", type: "private", region: "south-east" },
  { id: "ajayi", name: "Ajayi Crowther University", short: "ACU", state: "Oyo", type: "private", region: "south-west" },
  { id: "alhikmah", name: "Al-Hikmah University", short: "AHU", state: "Kwara", type: "private", region: "north-central" },

  { id: "leadcity", name: "Lead City University", short: "LCU", state: "Oyo", type: "private", region: "south-west" },
  { id: "crescent", name: "Crescent University", short: "CUAB", state: "Ogun", type: "private", region: "south-west" },
  { id: "caritas", name: "Caritas University", short: "CARITAS", state: "Enugu", type: "private", region: "south-east" },
  { id: "novena", name: "Novena University", short: "NOVENA", state: "Delta", type: "private", region: "south-south" },
  { id: "panatlantic", name: "Pan-Atlantic University", short: "PAU", state: "Lagos", type: "private", region: "south-west" },
  { id: "veritas", name: "Veritas University", short: "VU", state: "FCT", type: "private", region: "north-central" },
  { id: "baze", name: "Baze University", short: "BAZE", state: "FCT", type: "private", region: "north-central" },
  { id: "nile", name: "Nile University", short: "NILE", state: "FCT", type: "private", region: "north-central" },
  { id: "bells", name: "Bells University of Technology", short: "BUT", state: "Ogun", type: "private", region: "south-west" },
  { id: "landmark", name: "Landmark University", short: "LU", state: "Kwara", type: "private", region: "north-central" },
];

// Support both <script src> global use and future ES module imports.
if (typeof module !== "undefined" && module.exports) {
  module.exports = UNIVERSITIES;
}
