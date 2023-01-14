import fs from 'fs/promises';
import JiraApi from 'jira-client';
import config from './config.js';
import IssueParser from './IssueParser.js';

const { username, password, component, dateFrom } = config;

let jira;

try {
  jira = new JiraApi({
    protocol: 'https',
    host: 'jira.lucky-team.pro',
    username,
    password,
    apiVersion: '2',
    strictSSL: true,
  });
} catch (error) {
  if (error.message.match('(401)')) console.log('Неверные данные от jira');
  else console.error(error.message);
}

const textQueries = [
  '',
  'Добавить преленд без каких либо изменений по контенту',
  'Изменение в текущем промо',
  'Копия промо с будущими изменениями',
  'Добавить преленд и адаптировать под другой оффер',
];

const [
  allQuery,
  noChangesQuery,
  currentPromoQuery,
  copyPromoQuery,
  geoCharactersQuery,
] = textQueries.map(
  (query) =>
    `project = LAND AND status = Done AND component = ${component} AND resolved >= ${dateFrom} ${
      query ? ` AND text ~ "${query}" ` : ''
    }ORDER BY priority DESC, updated DESC`
);

const issueParser = new IssueParser(jira);

await issueParser.makeQuery('Всего задач', allQuery);
await issueParser.makeQuery('Без изменений по контенту', noChangesQuery, 1, 11);
await issueParser.makeQuery(
  'Изменения в текущем промо',
  currentPromoQuery,
  1,
  11
);
await issueParser.makeQuery('Копия промо', copyPromoQuery, 2, 22);
await issueParser.makeQuery(
  'Добавить и адаптировать под другой оффер',
  geoCharactersQuery,
  3,
  33
);

issueParser.sumUp();

issueParser.writeOutput();
