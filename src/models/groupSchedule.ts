import {
  Model, Sequelize, DataTypes, QueryTypes, CreationOptional,
} from 'sequelize';
import { RRule } from 'rrule';
import moment = require('moment');
import { getRRuleByWeekDay, getRRuleFreq } from '../utils/rrule';
import ApiError from '../errors/apiError';

import Group from './group';

class GroupSchedule extends Model {
  declare id: CreationOptional<number>;

  declare groupId: number;

  declare title: string;

  declare content: string | null;

  declare startDateTime: Date;

  declare endDateTime: Date;

  declare recurrence: number;

  declare freq: CreationOptional<string>;;

  declare interval: CreationOptional<number>;

  declare byweekday: CreationOptional<string>;

  declare until: CreationOptional<Date>;

  static initiate(sequelize: Sequelize) {
    GroupSchedule.init({
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      groupId: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      startDateTime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      endDateTime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      recurrence: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
      },
      freq: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      interval: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      byweekday: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      until: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    }, {
      sequelize,
      timestamps: false,
      modelName: 'GroupSchedule',
      tableName: 'groupSchedule',
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate() {
    GroupSchedule.belongsTo(Group, {
      foreignKey: 'groupId',
    });
  }

  public static async getSchedule(groupID: number[], start: Date, end: Date) {
    try {
      const db = require('.');
      const nonRecurrenceStatement = `
      SELECT 
        id,
        title, 
        content, 
        startDateTime, 
        endDateTime, 
        recurrence,
        true AS isGroup
      FROM 
        groupSchedule
      WHERE 
        groupId IN (${groupID.join(',')}) AND (
        recurrence = 0 AND ( 
          (startDateTime BETWEEN :start AND :end)
          OR
          (endDateTime BETWEEN :start AND :end)
          OR
          (startDateTime < :start AND endDateTime > :end)
        )
      )`;

      const recurrenceStatement = `
        SELECT 
          *,
          true AS isGroup 
        FROM 
          groupSchedule
        WHERE 
          groupId IN (${groupID.join(',')}) AND (
          recurrence = 1 AND 
          startDateTime <= :end
        )`;

      const nonRecurrenceSchedule = await db.sequelize.query(nonRecurrenceStatement, {
        replacements: {
          start: moment.utc(start).format('YYYY-MM-DDTHH:mm:ssZ'),
          end: moment.utc(end).format('YYYY-MM-DDTHH:mm:ssZ'),
        },
        type: QueryTypes.SELECT,
      });
      const recurrenceScheduleList = await db.sequelize.query(recurrenceStatement, {
        replacements: {
          start: moment.utc(start).format('YYYY-MM-DDTHH:mm:ssZ'),
          end: moment.utc(end).format('YYYY-MM-DDTHH:mm:ssZ'),
        },
        type: QueryTypes.SELECT,
      });

      const recurrenceSchedule = [];
      recurrenceScheduleList.forEach((schedule) => {
        const byweekday = getRRuleByWeekDay(schedule.byweekday);
        let rrule;
        if (byweekday.length === 0) {
          rrule = new RRule({
            freq: getRRuleFreq(schedule.freq),
            interval: schedule.interval,
            dtstart: schedule.startDateTime,
            until: schedule.until,
          });
        } else {
          rrule = new RRule({
            freq: getRRuleFreq(schedule.freq),
            interval: schedule.interval,
            byweekday: getRRuleByWeekDay(schedule.byweekday),
            dtstart: schedule.startDateTime,
            until: schedule.until,
          });
        }

        const scheduleLength = new Date(schedule.endDateTime).getTime() - new Date(schedule.startDateTime).getTime();
        const scheduleDateList = rrule.between(
          new Date(start.getTime() - scheduleLength),
          new Date(end.getTime() + 1),
        );

        const possibleDateList = [];
        scheduleDateList.forEach((scheduleDate) => {
          const endDateTime = new Date(scheduleDate.getTime() + scheduleLength);
          if (endDateTime >= start) {
            possibleDateList.push({ startDateTime: scheduleDate, endDateTime });
          }
        });
        if (possibleDateList.length !== 0) {
          recurrenceSchedule.push({
            id: schedule.id,
            groupId: schedule.groupId,
            title: schedule.title,
            content: schedule.content,
            recurrence: schedule.recurrence,
            freq: schedule.freq,
            interval: schedule.interval,
            byweekday: schedule.byweekday,
            until: schedule.until,
            isGroup: schedule.isGroup,
            recurrenceDateList: possibleDateList,
          });
        }
      });
      return { nonRecurrenceSchedule, recurrenceSchedule };
    } catch (err) {
      throw new ApiError();
    }
  }
}

export default GroupSchedule;
