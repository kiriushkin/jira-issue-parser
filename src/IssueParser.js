import fs from 'fs/promises';
import config from './config.js';

const {
  component,
  dateFrom,
  scorePlan,
  ratioPlan,
  baseBonus,
  hoursLimit,
  isLimitHours,
} = config;

class IssueParser {
  constructor(jira) {
    this.jira = jira;
    this.component = component;
    this.dateFrom = dateFrom;
    this.text = [];
    this.issues = [];
    this.score = 0;
    this.ratio = 0;

    this.text.push(`Команда: ${component}`);
    this.text.push(
      `Период: c ${new Date(
        dateFrom
      ).toLocaleDateString()} по ${new Date().toLocaleDateString()}`
    );
    this.insertLine();

    this.text.push(`План задач: ${scorePlan}`);
    this.text.push(`План коэффициент: ${ratioPlan}`);
    this.text.push(`Базовая премия: ${baseBonus}`);

    if (isLimitHours)
      this.text.push(`Ограничение по часам одной задачи: ${hoursLimit}`);

    this.insertLine();
  }

  async makeQuery(text, query, weight, targetHours) {
    const resp = await this.jira.searchJira(query, {
      maxResults: 1000,
      fields: ['created'],
      expand: ['changelog'],
    });

    this.text.push(`${text}: ${resp.total}`);

    const score = weight ? resp.total * weight : null;

    if (score) this.text.push(`  Баллов: ${score}`);

    const hours = this.calculateHours(resp.issues);

    this.text.push(`  Средние часы: ${Math.round(hours * 100) / 100}`);

    const ratio = targetHours ? targetHours / hours : null;

    if (ratio)
      this.text.push(`  коэффициент: ${Math.round(ratio * 100) / 100}`);

    this.insertLine();

    this.issues.push({ title: text, amount: resp.total, score, ratio });
  }

  insertLine() {
    this.text.push('-'.repeat(25));
  }

  calculateHours(issues) {
    try {
      const issueHours = [];

      for (const issue of issues) {
        let spentHours = 0;

        let fromDate = new Date(issue.fields.created);
        let toDate;

        for (const history of issue.changelog.histories) {
          for (const item of history.items) {
            // if (item.field === 'Component' && item.toString === this.component)
            //   fromDate = new Date(history.created);
            if (
              (item.field === 'status' && item.toString === 'Перевод') ||
              item.toString === 'Финальная проверка' ||
              item.toString === 'Требует уточнения'
            ) {
              toDate = new Date(history.created);

              spentHours +=
                (toDate.getTime() - fromDate.getTime()) / 1000 / 60 / 60;
            }
            if (
              (item.field === 'status' && item.fromString === 'Перевод') ||
              item.fromString === 'Финальная проверка' ||
              item.fromString === 'Требует уточнения'
            )
              fromDate = new Date(history.created);
          }
        }

        issueHours.push(spentHours);
      }

      const arr = isLimitHours
        ? issueHours.filter((val) => hoursLimit > val)
        : issueHours;

      const allHours = arr.reduce((sum, val) => sum + val, 0);

      const averageHours = allHours / arr.length;

      return averageHours;
    } catch (err) {
      console.error(err);
    }
  }

  sumUp() {
    let score = 0,
      ratio = 0,
      amount = 0;

    this.issues.forEach((issue) => {
      if (issue.score) score += issue.score;
      if (issue.ratio) (ratio += issue.ratio), amount++;
    });

    ratio = ratio / amount;

    this.text.push(`Всего баллов: ${score}`);
    this.text.push(`Общий коэффициент: ${Math.round(ratio * 100) / 100}`);
    this.insertLine();

    const scoreTotal = (score / scorePlan) * 0.6 * 100;
    const ratioTotal = (ratio / ratioPlan) * 0.4 * 100;
    const total = Math.round((scoreTotal + ratioTotal) * 100) / 100;
    const bonus = Math.round(((baseBonus * total) / 100) * 100) / 100;

    this.text.push(`Итого баллов: ${total}`);
    this.text.push(`Итоговая сумма: ${bonus} (${bonus / 4})`);
  }

  async writeOutput() {
    const filePath = `../out/${new Date()
      .toLocaleDateString()
      .replace('/', '.')}-${this.component}-${
      isLimitHours ? 'limited' : ''
    }.log`;

    try {
      await fs.access('../out');
    } catch (err) {
      await fs.mkdir('../out');
    }

    await fs.writeFile(filePath, this.text.join('\r\n'));

    console.log(`Результаты доступны в ${filePath.replace('../', '')}`);
  }
}

export default IssueParser;
