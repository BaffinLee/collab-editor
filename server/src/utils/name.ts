// @ts-ignore
import firstNames from "../../node_modules/@faker-js/faker/dist/cjs/locales/en/name/first_name.js";
// @ts-ignore
import lastNames from "../../node_modules/@faker-js/faker/dist/cjs/locales/en/name/last_name.js";

export function getRandomName() {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${firstName} ${lastName}`;
}
