import fs from 'fs/promises';
import JiraApi from 'jira-client';
import config from './config.js';

const { username, password, component, dateFrom } = config;

try {
  let jira = new JiraApi({
    protocol: 'https',
    host: 'jira.lucky-team.pro',
    username,
    password,
    apiVersion: '2',
    strictSSL: true,
  });

  const ALL_QUERY = `project = LAND AND status = Done AND component = ${component} AND resolved >= ${dateFrom} ORDER BY priority DESC, updated DESC`;

  const NO_CHANGES_QUERY = `project = LAND AND status = Done AND component = ${component} AND resolved >= ${dateFrom} AND text ~ "Добавить преленд без каких либо изменений по контенту" ORDER BY priority DESC, updated DESC`;

  const CURRENT_PROMO_QUERY = `project = LAND AND status = Done AND component = ${component} AND resolved >= ${dateFrom} AND text ~ "Изменение в текущем промо" ORDER BY priority DESC, updated DESC`;

  const COPY_PROMO_QUERY = `project = LAND AND status = Done AND component = ${component} AND resolved >= ${dateFrom} AND text ~ "Копия промо с будущими изменениями" ORDER BY priority DESC, updated DESC`;

  const GEO_CHARACTERS_QUERY = `project = LAND AND status = Done AND component = ${component} AND resolved >= ${dateFrom} AND text ~ "Добавить преленд и адаптировать под оффер, новое гео, персонажей" ORDER BY priority DESC, updated DESC`;

  const text = [];

  text.push(`Команда: ${component}`);
  text.push(`Период: c ${dateFrom} по сейчас`);
  text.push('-'.repeat(25));

  const allResp = jira.searchJira(ALL_QUERY, {
    maxResults: 1,
  });

  const noChangesResp = jira.searchJira(NO_CHANGES_QUERY, {
    maxResults: 1,
  });

  const currentPromoResp = jira.searchJira(CURRENT_PROMO_QUERY, {
    maxResults: 1,
  });

  const copyPromoResp = jira.searchJira(COPY_PROMO_QUERY, {
    maxResults: 1,
  });

  const [
    { total: allIssues },
    { total: noChangesIssues },
    { total: currentPromoIssues },
    { total: copyPromoIssues },
  ] = await Promise.all([
    allResp,
    noChangesResp,
    currentPromoResp,
    copyPromoResp,
  ]);

  text.push(`Всего задач: ${allIssues}`);
  text.push(`Без изменений по контенту: ${noChangesIssues}`);
  text.push(`Изменения в текущем промо: ${currentPromoIssues}`);
  text.push(`Копия промо: ${copyPromoIssues}`);

  const geoCharactersIssues =
    allIssues - noChangesIssues - currentPromoIssues - copyPromoIssues;

  text.push(`Добавить преленд и адаптировать: ${geoCharactersIssues}`);

  text.push('-'.repeat(25));

  const score =
    noChangesIssues +
    currentPromoIssues +
    copyPromoIssues * 2 +
    geoCharactersIssues * 3;

  text.push(`Всего баллов: ${score}`);

  const filePath = `../out/${new Date().toLocaleDateString()}.log`;

  try {
    await fs.access('../out');
  } catch (err) {
    await fs.mkdir('../out');
  }

  await fs.writeFile(filePath, text.join('\r\n'));

  console.log(`Результаты доступны в ${filePath.replace('../', '')}`);
} catch (error) {
  if (error.message.match('(401)')) console.log('Неверные данные от jira');
}
