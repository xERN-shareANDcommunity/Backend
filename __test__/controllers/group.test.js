const request = require('supertest');
const app = require('../../src/app');
const GroupSchedule = require('../../src/models/groupSchedule');
const {
  db, syncDB, dropDB,
  tearDownGroupDB, tearDownGroupScheduleDB, tearDownUserDB,
  setUpGroupDB, setUpGroupScheduleDB, setUpUserDB, tearDownPersonalScheduleDB,
  setUpPersonalScheduleDB2, setUpGroupPostDB, tearDownGroupPostDB,
} = require('../dbSetup');
const Group = require('../../src/models/group');

describe('Test /api/group endpoints', () => {
  let cookie;
  beforeAll(async () => {
    await dropDB();
    await syncDB();

    await tearDownPersonalScheduleDB();
    await tearDownGroupScheduleDB();
    await tearDownGroupPostDB();
    await tearDownUserDB();
    await tearDownGroupDB();

    await setUpUserDB();
    await setUpGroupDB();
    await setUpGroupScheduleDB();
    await setUpGroupPostDB();
    await setUpPersonalScheduleDB2();

    const res = await request(app).post('/api/auth/login').send({
      email: 'test-user1@email.com',
      password: 'super_strong_password',
    });
    // eslint-disable-next-line prefer-destructuring
    cookie = res.headers['set-cookie'][0];
  });

  beforeEach(async () => {
    await tearDownPersonalScheduleDB();
    await tearDownGroupScheduleDB();
    await tearDownGroupPostDB();
    await tearDownGroupDB();

    await setUpPersonalScheduleDB2();
    await setUpGroupDB();
    await setUpGroupScheduleDB();
    await setUpGroupPostDB();
  });

  afterEach(async () => {
    await tearDownPersonalScheduleDB();
    await tearDownGroupScheduleDB();
    await tearDownGroupPostDB();
  });

  afterAll(async () => {
    await dropDB();
    await db.sequelize.close();
  });

  describe('Test POST /api/group', () => {
    it('Successfully create group', async () => {
      const res = await request(app).post('/api/group').set('Cookie', cookie).send({
        name: 'test-group',
      });
      expect(res.status).toEqual(200);
    });
  });

  describe('Test DELETE /api/group', () => {
    it('Successfully delete group', async () => {
      const id = 1;
      const res = await request(app).delete(`/api/group/${id}`).set('Cookie', cookie);
      expect(res.status).toEqual(204);
    });

    it('Successfully fail to group (not a group leader)', async () => {
      const id = 2;
      const res = await request(app).delete(`/api/group/${id}`).set('Cookie', cookie);
      expect(res.status).toEqual(403);
    });

    it('Successfully fail to delete group (Group Not Found)', async () => {
      const id = 5;
      const res = await request(app).delete(`/api/group/${id}`).set('Cookie', cookie);
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Group Not Found' });
    });

    it('Successfully fail to delete group (DataFormat Error)', async () => {
      const id = 'abc';
      const res = await request(app).delete(`/api/group/${id}`).set('Cookie', cookie);
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({ error: 'The requested data format is not valid.' });
    });
  });

  describe('Test PATCH /api/group', () => {
    it('Successfully update group leader', async () => {
      const id = 1;
      const newLeaderId = 2;
      const res = await request(app).patch(`/api/group/${id}`).set('Cookie', cookie).send({
        newLeaderId,
      });

      const group = await Group.findByPk(id);
      expect(res.status).toEqual(200);
      expect(group.leader).toEqual(2);
    });

    it('Successfully fail to update group (group not found)', async () => {
      const id = 100;
      const newLeaderId = 2;
      const res = await request(app).patch(`/api/group/${id}`).set('Cookie', cookie).send({
        newLeaderId,
      });

      expect(res.status).toEqual(404);
    });
  });

  describe('Test GET /api/group/:group_id', () => {
    it('Successfully get a group detail', async () => {
      const id = 1;
      const res = await request(app).get(`/api/group/${id}`).set('Cookie', cookie);
      const expectedGroups = {
        group: {
          groupId: 1,
          inviteCode: 'inviteCode01',
          inviteExp: '2099-01-01T00:00:00.000Z',
          isPublicGroup: 0,
          leader: 1,
          member: 2,
          name: 'test-group1',
        },
        leaderInfo: {
          nickname: 'test-user1',
          userId: 1,
        },
        memberInfo: [
          {
            nickname: 'test-user1',
            userId: 1,
          },
          {
            nickname: 'test-user2',
            userId: 2,
          },
        ],
      };

      expect(res.status).toEqual(200);
      expect(res.body).toEqual(expectedGroups);
    });

    it('Successfully fail to get an group detail (DataFormat Error)', async () => {
      const id = 'abc';
      const res = await request(app).get(`/api/group/${id}`).set('Cookie', cookie);
      expect(res.status).toEqual(400);
    });

    it('Successfully failed to get an group detail (Group Not Found)', async () => {
      const id = 10000;
      const res = (await request(app).get(`/api/group/${id}`).set('Cookie', cookie));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Group Not Found' });
    });
  });

  describe('Test POST /api/group/:group_id/calendar', () => {
    it('Group schedule creation successful ', async () => {
      const groupId = 1;
      const res = await request(app).post(`/api/group/${groupId}/calendar`).set('Cookie', cookie).send({
        title: 'test-title',
        content: 'test-content',
        startDateTime: '2023-05-06',
        endDateTime: '2023-05-07',
        recurrence: 1,
        freq: 'WEEKLY',
        interval: 1,
        byweekday: 'MO',
        until: '2026-01-05',
      });

      expect(res.status).toEqual(201);
    });
  });

  describe('Test PUT /api/group/calendar', () => {
    it('Group Schedule Modification Successful ', async () => {
      const id = 1;
      const res = await request(app).put(`/api/group/calendar/${id}`).set('Cookie', cookie).send({
        groupId: 1,
        title: 'modified-title',
        content: 'modified-contnent',
      });

      const modifiedSchedule = await GroupSchedule.findOne({
        where: { title: 'modified-title' },
      });

      expect(modifiedSchedule.id).toEqual(1);
      expect(res.status).toEqual(201);
    });
  });

  describe('Test DELETE /api/group/calendar', () => {
    it('Group schedule deleted successfully ', async () => {
      const id = 4;
      const res = await request(app).delete(`/api/group/calendar/${id}`).set('Cookie', cookie);
      expect(res.status).toEqual(204);
    });

    it('Successfully fail to delete group (DataFormat Error)', async () => {
      const id = 'abc';
      const res = await request(app).delete(`/api/group/calendar/${id}`).set('Cookie', cookie);
      expect(res.status).toEqual(400);
    });
  });

  describe('Test GET /api/group/:group_id/calendar', () => {
    it('Successfully get an April Schedule ', async () => {
      const groupID = 1;
      const startDateTime = '2023-04-01T00:00:00.000Z';
      const endDateTime = '2023-04-30T23:59:59.999Z';
      const expectedSchedule = {
        nonRecurrenceSchedule: [
          {
            id: 1,
            isGroup: 0,
            content: 'test-content1',
            endDateTime: '2023-05-15T23:59:59.000Z',
            recurrence: 0,
            startDateTime: '2023-02-03T00:00:00.000Z',
            title: 'test-title1',
          },
          {
            id: 2,
            isGroup: 0,
            content: 'test-content2',
            endDateTime: '2023-04-30T23:59:59.000Z',
            recurrence: 0,
            startDateTime: '2023-04-15T00:00:00.000Z',
            title: 'test-title2',
          },
          {
            id: 3,
            isGroup: 0,
            content: 'test-content3',
            endDateTime: '2023-04-15T23:59:59.000Z',
            recurrence: 0,
            startDateTime: '2023-04-10T00:00:00.000Z',
            title: 'test-title3',
          },
          {
            id: 4,
            isGroup: 0,
            content: 'test-content4',
            endDateTime: '2023-04-30T23:59:59.000Z',
            recurrence: 0,
            startDateTime: '2023-04-01T00:00:00.000Z',
            title: 'test-title4',
          },
          {
            id: 1,
            isGroup: 1,
            content: 'test-content1',
            endDateTime: '2023-05-15T23:59:59.000Z',
            recurrence: 0,
            startDateTime: '2023-02-03T00:00:00.000Z',
            title: 'test-title1',
          },
          {
            id: 2,
            isGroup: 1,
            content: 'test-content2',
            endDateTime: '2023-04-30T23:59:59.000Z',
            recurrence: 0,
            startDateTime: '2023-04-15T00:00:00.000Z',
            title: 'test-title2',
          },
          {
            id: 4,
            isGroup: 1,
            content: 'test-content4',
            endDateTime: '2023-04-30T23:59:59.000Z',
            recurrence: 0,
            startDateTime: '2023-04-01T00:00:00.000Z',
            title: 'test-title4',
          },
          {
            id: 5,
            isGroup: 1,
            content: 'test-content5',
            endDateTime: '2023-04-30T23:59:59.000Z',
            recurrence: 0,
            startDateTime: '2023-03-15T00:00:00.000Z',
            title: 'test-title5',
          },
          {
            id: 6,
            isGroup: 1,
            content: 'test-content6',
            endDateTime: '2023-05-15T23:59:59.000Z',
            recurrence: 0,
            startDateTime: '2023-04-15T00:00:00.000Z',
            title: 'test-title6',
          },
          {
            id: 9,
            isGroup: 1,
            content: 'test-content9',
            endDateTime: '2023-04-01T08:59:59.000Z',
            recurrence: 0,
            startDateTime: '2023-03-15T00:00:00.000Z',
            title: 'test-title9',
          },
          {
            id: 10,
            isGroup: 1,
            content: 'test-content10',
            endDateTime: '2023-05-15T23:59:59.000Z',
            recurrence: 0,
            startDateTime: '2023-04-30T23:59:59.000Z',
            title: 'test-title10',
          },
        ],
        recurrenceSchedule: [
          {
            byweekday: '',
            content: 'test-content11',
            freq: 'DAILY',
            groupId: 1,
            id: 11,
            isGroup: 1,
            interval: 1,
            recurrence: 1,
            recurrenceDateList: [
              { endDateTime: '2023-04-01T13:00:00.000Z', startDateTime: '2023-04-01T12:00:00.000Z' },
              { endDateTime: '2023-04-02T13:00:00.000Z', startDateTime: '2023-04-02T12:00:00.000Z' },
              { endDateTime: '2023-04-03T13:00:00.000Z', startDateTime: '2023-04-03T12:00:00.000Z' },
              { endDateTime: '2023-04-04T13:00:00.000Z', startDateTime: '2023-04-04T12:00:00.000Z' },
              { endDateTime: '2023-04-05T13:00:00.000Z', startDateTime: '2023-04-05T12:00:00.000Z' },
            ],
            title: 'test-title11',
            until: '2023-04-05T14:00:00.000Z',
          },
          {
            byweekday: '',
            content: 'test-content12',
            freq: 'MONTHLY',
            groupId: 1,
            id: 12,
            isGroup: 1,
            interval: 1,
            recurrence: 1,
            recurrenceDateList: [
              { endDateTime: '2023-04-15T13:00:00.000Z', startDateTime: '2023-04-15T12:00:00.000Z' },
            ],
            title: 'test-title12',
            until: '2025-01-01T00:00:00.000Z',
          },
          {
            byweekday: '',
            content: 'test-content13',
            freq: 'WEEKLY',
            groupId: 1,
            id: 13,
            isGroup: 1,
            interval: 1,
            recurrence: 1,
            recurrenceDateList: [
              { endDateTime: '2023-04-05T13:00:00.000Z', startDateTime: '2023-04-05T12:00:00.000Z' },
              { endDateTime: '2023-04-12T13:00:00.000Z', startDateTime: '2023-04-12T12:00:00.000Z' },
              { endDateTime: '2023-04-19T13:00:00.000Z', startDateTime: '2023-04-19T12:00:00.000Z' },
              { endDateTime: '2023-04-26T13:00:00.000Z', startDateTime: '2023-04-26T12:00:00.000Z' },
            ],
            title: 'test-title13',
            until: '2025-01-01T00:00:00.000Z',
          },
          {
            byweekday: '',
            content: 'test-content14',
            freq: 'YEARLY',
            groupId: 1,
            id: 14,
            isGroup: 1,
            interval: 1,
            recurrence: 1,
            recurrenceDateList: [
              { endDateTime: '2023-04-15T13:00:00.000Z', startDateTime: '2023-04-15T12:00:00.000Z' },
            ],
            title: 'test-title14',
            until: '2025-01-01T00:00:00.000Z',
          },
          {
            byweekday: 'MO,TU',
            content: 'test-content15',
            freq: 'DAILY',
            groupId: 1,
            id: 15,
            isGroup: 1,
            interval: 1,
            recurrence: 1,
            recurrenceDateList: [
              { endDateTime: '2023-04-03T13:00:00.000Z', startDateTime: '2023-04-03T12:00:00.000Z' },
              { endDateTime: '2023-04-04T13:00:00.000Z', startDateTime: '2023-04-04T12:00:00.000Z' },
              { endDateTime: '2023-04-10T13:00:00.000Z', startDateTime: '2023-04-10T12:00:00.000Z' },
              { endDateTime: '2023-04-11T13:00:00.000Z', startDateTime: '2023-04-11T12:00:00.000Z' },
              { endDateTime: '2023-04-17T13:00:00.000Z', startDateTime: '2023-04-17T12:00:00.000Z' },
              { endDateTime: '2023-04-18T13:00:00.000Z', startDateTime: '2023-04-18T12:00:00.000Z' },
              { endDateTime: '2023-04-24T13:00:00.000Z', startDateTime: '2023-04-24T12:00:00.000Z' },
              { endDateTime: '2023-04-25T13:00:00.000Z', startDateTime: '2023-04-25T12:00:00.000Z' },
            ],
            title: 'test-title15',
            until: '2025-01-01T00:00:00.000Z',
          },
          {
            byweekday: '',
            content: 'test-content16',
            freq: 'DAILY',
            groupId: 1,
            id: 16,
            isGroup: 1,
            interval: 1,
            recurrence: 1,
            recurrenceDateList: [
              { endDateTime: '2023-04-02T00:00:00.000Z', startDateTime: '2023-03-16T12:00:00.000Z' },
              { endDateTime: '2023-04-03T00:00:00.000Z', startDateTime: '2023-03-17T12:00:00.000Z' },
              { endDateTime: '2023-04-04T00:00:00.000Z', startDateTime: '2023-03-18T12:00:00.000Z' },
              { endDateTime: '2023-04-05T00:00:00.000Z', startDateTime: '2023-03-19T12:00:00.000Z' },
            ],
            title: 'test-title16',
            until: '2023-03-20T00:00:00.000Z',
          },
          {
            byweekday: '',
            content: 'test-content17',
            freq: 'WEEKLY',
            groupId: 1,
            id: 17,
            isGroup: 1,
            interval: 1,
            recurrence: 1,
            recurrenceDateList: [
              { endDateTime: '2023-04-05T00:00:00.000Z', startDateTime: '2023-03-19T12:00:00.000Z' },
              { endDateTime: '2023-04-12T00:00:00.000Z', startDateTime: '2023-03-26T12:00:00.000Z' },
              { endDateTime: '2023-04-19T00:00:00.000Z', startDateTime: '2023-04-02T12:00:00.000Z' },
              { endDateTime: '2023-04-26T00:00:00.000Z', startDateTime: '2023-04-09T12:00:00.000Z' },
              { endDateTime: '2023-05-03T00:00:00.000Z', startDateTime: '2023-04-16T12:00:00.000Z' },
              { endDateTime: '2023-05-10T00:00:00.000Z', startDateTime: '2023-04-23T12:00:00.000Z' },
              { endDateTime: '2023-05-17T00:00:00.000Z', startDateTime: '2023-04-30T12:00:00.000Z' },
            ],
            title: 'test-title17',
            until: '2025-01-01T00:00:00.000Z',
          },
          {
            byweekday: '',
            content: 'test-content18',
            freq: 'MONTHLY',
            groupId: 1,
            id: 18,
            isGroup: 1,
            interval: 1,
            recurrence: 1,
            recurrenceDateList: [
              { endDateTime: '2023-05-02T00:00:00.000Z', startDateTime: '2023-04-15T12:00:00.000Z' },
            ],
            title: 'test-title18',
            until: '2025-01-01T00:00:00.000Z',
          },
          {
            byweekday: '',
            content: 'test-content19',
            freq: 'YEARLY',
            groupId: 1,
            id: 19,
            isGroup: 1,
            interval: 1,
            recurrence: 1,
            recurrenceDateList: [
              { endDateTime: '2023-04-02T00:00:00.000Z', startDateTime: '2023-01-15T12:00:00.000Z' },
            ],
            title: 'test-title19',
            until: '2025-01-01T00:00:00.000Z',
          },
          {
            byweekday: '',
            content: 'test-content21',
            freq: 'MONTHLY',
            groupId: 1,
            id: 21,
            isGroup: 1,
            interval: 1,
            recurrence: 1,
            recurrenceDateList: [
              { endDateTime: '2023-05-01T23:59:59.000Z', startDateTime: '2023-04-30T23:59:59.000Z' },
            ],
            title: 'test-title21',
            until: '2025-01-01T00:00:00.000Z',
          },
        ],
      };
      const res = await request(app).get(`/api/group/${groupID}/calendar`).set('Cookie', cookie).query({
        startDateTime,
        endDateTime,
      });

      expect(res.status).toEqual(200);
      expect(res.body).toEqual(expectedSchedule);
    });
  });

  describe('Test POST /api/group/:group_id/invite-link', () => {
    it('Successfully generated invitation code ', async () => {
      const groupId = 1;
      const res = (await request(app).post(`/api/group/${groupId}/invite-link`).set('Cookie', cookie));
      expect(res.status).toEqual(200);
    });

    it('Successfully failed to create invitation code (Group Not Found) ', async () => {
      const groupId = 100;
      const res = (await request(app).post(`/api/group/${groupId}/invite-link`).set('Cookie', cookie));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Group Not Found' });
    });
  });

  describe('Test GET /api/group/invite-link/:inviteCode', () => {
    it('Successfully get an invitation ', async () => {
      const inviteCode = 'inviteCode01';
      const res = (await request(app).get(`/api/group/invite-link/${inviteCode}`).set('Cookie', cookie));
      const expectedGroups = {
        group: {
          groupId: 1,
          name: 'test-group1',
          leader: 1,
          member: 2,
          inviteCode: 'inviteCode01',
          inviteExp: '2099-01-01T00:00:00.000Z',
          isPublicGroup: 0,
        },
      };
      expect(res.status).toEqual(200);
      expect(res.body).toEqual(expectedGroups);
    });

    it('Successfully failed to get an invitation (Group Not Found)', async () => {
      const inviteCode = 'isWrongInviteCode';
      const res = (await request(app).get(`/api/group/invite-link/${inviteCode}`).set('Cookie', cookie));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Group Not Found' });
    });

    it('Successfully failed to get an invitation (Expired Code Error)', async () => {
      const inviteCode = 'expiredCode02';
      const res = (await request(app).get(`/api/group/invite-link/${inviteCode}`).set('Cookie', cookie));
      expect(res.status).toEqual(410);
      expect(res.body).toEqual({ error: 'Expired invitation code.' });
    });
  });

  describe('Test POST /api/group/join/:inviteCode', () => {
    it('Successfully joined the group ', async () => {
      const inviteCode = 'inviteCode03';
      const res = (await request(app).post(`/api/group/join/${inviteCode}`).set('Cookie', cookie));
      expect(res.status).toEqual(200);
      expect(res.body).toEqual({ message: 'Successfully joined the group.' });
    });

    it('Successfully failed to join the group (Group Not Found) ', async () => {
      const inviteCode = 'isWrongInviteCode';
      const res = (await request(app).post(`/api/group/join/${inviteCode}`).set('Cookie', cookie));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Group Not Found' });
    });

    it('Successfully failed to join the group (Expired Code Error) ', async () => {
      const inviteCode = 'expiredCode02';
      const res = (await request(app).post(`/api/group/join/${inviteCode}`).set('Cookie', cookie));
      expect(res.status).toEqual(410);
      expect(res.body).toEqual({ error: 'Expired invitation code.' });
    });

    it('Successfully failed to join the group (Invalid Group Join Error) ', async () => {
      const inviteCode = 'inviteCode01';
      const res = (await request(app).post(`/api/group/join/${inviteCode}`).set('Cookie', cookie));
      expect(res.status).toEqual(403);
      expect(res.body).toEqual({ error: 'You are already a member of this group.' });
    });
  });

  describe('Test GET /api/group/:group_id/proposal', () => {
    it('Successfully get a list of Event', async () => {
      const id = 1;
      const date1 = '2023-04-15T00:00:00.000Z';
      const date2 = '2030-04-16T00:00:00.000Z';
      const date3 = '2000-04-01T00:00:00.000Z';
      const res = await request(app).get(`/api/group/${id}/proposal`).set('Cookie', cookie).query({
        date1,
        date2,
        date3,
      });
      const expectedProposal = {
        '2000-04-01T00:00:00.000Z': [
          {
            duration: 210,
            endDateTime: '2000-04-01T13:00:00.000Z',
            startDateTime: '2000-04-01T09:30:00.000Z',
          },
          {
            duration: 150,
            endDateTime: '2000-04-01T20:30:00.000Z',
            startDateTime: '2000-04-01T18:00:00.000Z',
          },
          {
            duration: 120,
            endDateTime: '2000-04-01T08:00:00.000Z',
            startDateTime: '2000-04-01T06:00:00.000Z',
          },
          {
            duration: 50,
            endDateTime: '2000-04-01T23:30:00.000Z',
            startDateTime: '2000-04-01T22:40:00.000Z',
          },
        ],
        '2023-04-15T00:00:00.000Z': [],
        '2030-04-16T00:00:00.000Z': [
          {
            duration: 1440,
            endDateTime: '2030-04-16T23:59:59.000Z',
            startDateTime: '2030-04-16T00:00:00.000Z',
          },
        ],
      };
      expect(res.status).toEqual(200);
      expect(res.body).toEqual(expectedProposal);
    });
  });

  describe('Test GET /api/group/calendar/:schedule_id', () => {
    it('Successfully retrieved a schedule', async () => {
      const scheduleId = 1;
      const res = await request(app).get(`/api/group/calendar/${scheduleId}`).set('Cookie', cookie);
      const expectedResult = {
        byweekday: null,
        content: 'test-content1',
        endDateTime: '2023-05-15T23:59:59.000Z',
        freq: null,
        groupId: 1,
        id: 1,
        interval: null,
        recurrence: 0,
        startDateTime: '2023-02-03T00:00:00.000Z',
        title: 'test-title1',
        until: null,
      };
      expect(res.status).toEqual(200);
      expect(res.body).toEqual(expectedResult);
    });

    it('Successfully failed to retrieved a schedule. (Schedule Not Found) ', async () => {
      const scheduleId = 10000;
      const res = (await request(app).get(`/api/group/calendar/${scheduleId}`).set('Cookie', cookie));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Schedule Not Found' });
    });

    it('Successfully failed to retrieved a schedule. (DataFormat Error) ', async () => {
      const scheduleId = 'abc';
      const res = (await request(app).get(`/api/group/calendar/${scheduleId}`).set('Cookie', cookie));
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({ error: 'The requested data format is not valid.' });
    });
  });

  describe('Test POST /api/group/:group_id/post', () => {
    it('Successfully created the post ', async () => {
      const groupId = 1;
      const title = 'testTitle';
      const content = 'testContent';
      const res = (await request(app).post(`/api/group/${groupId}/post`).set('Cookie', cookie).send({
        title,
        content,
      }));

      expect(res.status).toEqual(201);
      expect(res.body).toEqual({ message: 'Successfully created the post.' });
    });

    it('Successfully failed to create the post (Group Not Found) ', async () => {
      const groupId = 10000;
      const title = 'testTitle';
      const content = 'testContent';
      const res = (await request(app).post(`/api/group/${groupId}/post`).set('Cookie', cookie).send({
        title,
        content,
      }));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Group Not Found' });
    });

    it('Successfully failed to create the post (DataFormat Error) ', async () => {
      const groupId = 1;
      const title = 123;
      const content = 123;
      const res = (await request(app).post(`/api/group/${groupId}/post`).set('Cookie', cookie).send({
        title,
        content,
      }));
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({ error: 'The requested data format is not valid.' });
    });
  });

  describe('Test PUT /api/group/:group_id/post/:post_id', () => {
    it('Successfully modified the post ', async () => {
      const groupId = 1;
      const postId = 1;
      const title = 'modified-title';
      const content = 'modified-content';
      const res = (await request(app).put(`/api/group/${groupId}/post/${postId}`).set('Cookie', cookie).send({
        title,
        content,
      }));

      expect(res.status).toEqual(200);
      expect(res.body).toEqual({ message: 'Successfully modified the post.' });
    });

    it('Successfully failed to modified the post (Group Not Found) ', async () => {
      const groupId = 10000;
      const postId = 1;
      const title = 'testTitle';
      const content = 'testContent';
      const res = (await request(app).put(`/api/group/${groupId}/post/${postId}`).set('Cookie', cookie).send({
        title,
        content,
      }));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Group Not Found' });
    });

    it('Successfully failed to modified the post (Post Not Found) ', async () => {
      const groupId = 1;
      const postId = 10000;
      const title = 'testTitle';
      const content = 'testContent';
      const res = (await request(app).put(`/api/group/${groupId}/post/${postId}`).set('Cookie', cookie).send({
        title,
        content,
      }));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Post Not Found' });
    });

    it('Successfully failed to modified the post (DataFormat Error) ', async () => {
      const groupId = 1;
      const postId = 1;
      const title = 123;
      const content = 123;
      const res = (await request(app).put(`/api/group/${groupId}/post/${postId}`).set('Cookie', cookie).send({
        title,
        content,
      }));
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({ error: 'The requested data format is not valid.' });
    });

    it('Successfully failed to modified the post (Edit Permission Error) ', async () => {
      const groupId = 1;
      const postId = 2;
      const title = 'modified-title';
      const content = 'modified-content';
      const res = (await request(app).put(`/api/group/${groupId}/post/${postId}`).set('Cookie', cookie).send({
        title,
        content,
      }));
      expect(res.status).toEqual(403);
      expect(res.body).toEqual({ error: 'You do not have permission to modify the post.' });
    });
  });

  describe('Test DELETE /api/group/:group_id/post/:post_id', () => {
    it('Successfully deleted the post ', async () => {
      const groupId = 1;
      const postId = 1;
      const res = (await request(app).delete(`/api/group/${groupId}/post/${postId}`).set('Cookie', cookie));

      expect(res.status).toEqual(204);
      expect(res.body).toEqual({});
    });

    it('Successfully failed to deleted the post (Group Not Found) ', async () => {
      const groupId = 10000;
      const postId = 1;
      const res = (await request(app).delete(`/api/group/${groupId}/post/${postId}`).set('Cookie', cookie));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Group Not Found' });
    });

    it('Successfully failed to deleted the post (Post Not Found) ', async () => {
      const groupId = 1;
      const postId = 10000;
      const res = (await request(app).delete(`/api/group/${groupId}/post/${postId}`).set('Cookie', cookie));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Post Not Found' });
    });

    it('Successfully failed to deleted the post (DataFormat Error) ', async () => {
      const groupId = 'abc';
      const postId = 'abc';
      const res = (await request(app).delete(`/api/group/${groupId}/post/${postId}`).set('Cookie', cookie));
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({ error: 'The requested data format is not valid.' });
    });

    it('Successfully failed to deleted the post (Edit Permission Error) ', async () => {
      const groupId = 1;
      const postId = 2;
      const res = (await request(app).delete(`/api/group/${groupId}/post/${postId}`).set('Cookie', cookie));
      expect(res.status).toEqual(403);
      expect(res.body).toEqual({ error: 'You do not have permission to modify the post.' });
    });
  });

  describe('Test GET /api/group/:group_id/post/:post_id', () => {
    it('Successfully retrieved the post ', async () => {
      const groupId = 1;
      const postId = 1;
      const res = (await request(app).get(`/api/group/${groupId}/post/${postId}`).set('Cookie', cookie));
      const expectedPost = {
        author: 'test-user1',
        content: 'test-content1',
        title: 'test-title1',
      };
      expect(res.status).toEqual(200);
      expect(res.body).toEqual(expectedPost);
    });

    it('Successfully failed to retrieved the post. (Group Not Found) ', async () => {
      const groupId = 10000;
      const postId = 1;
      const res = (await request(app).get(`/api/group/${groupId}/post/${postId}`).set('Cookie', cookie));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Group Not Found' });
    });

    it('Successfully failed to retrieved the post. (Post Not Found) ', async () => {
      const groupId = 1;
      const postId = 10000;
      const res = (await request(app).get(`/api/group/${groupId}/post/${postId}`).set('Cookie', cookie));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Post Not Found' });
    });

    it('Successfully failed to retrieved the post. (DataFormat Error) ', async () => {
      const groupId = 'abc';
      const postId = 'abc';
      const res = (await request(app).get(`/api/group/${groupId}/post/${postId}`).set('Cookie', cookie));
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({ error: 'The requested data format is not valid.' });
    });
  });

  describe('Test GET /api/group/:group_id/post', () => {
    it('Successfully retrieved the posts. ', async () => {
      const groupId = 1;
      const page = 1;
      const res = (await request(app).get(`/api/group/${groupId}/post`).set('Cookie', cookie).query({
        page,
      }));
      const expectedResult = [
        {
          author: 'test-user1', title: 'test-title1', content: 'test-content1',
        },
        {
          author: 'test-user2', title: 'test-title2', content: 'test-content2',
        },
        {
          author: 'test-user1', title: 'test-title3', content: 'test-content3',
        },
        {
          author: 'test-user1', title: 'test-title4', content: 'test-content4',
        },
        {
          author: 'test-user1', title: 'test-title5', content: 'test-content5',
        },
        {
          author: 'test-user2', title: 'test-title7', content: 'test-content7',
        },
        {
          author: 'test-user2', title: 'test-title8', content: 'test-content8',
        },
      ];
      const result = res.body.map((post) => ({
        title: post.title,
        author: post.author,
        content: post.content,
      }));
      expect(res.status).toEqual(200);
      expect(result).toEqual(expectedResult);
    });

    it('Successfully failed to retrieved the posts. (Group Not Found) ', async () => {
      const groupId = 10000;
      const page = 1;
      const res = (await request(app).get(`/api/group/${groupId}/post`).set('Cookie', cookie).query({
        page,
      }));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Group Not Found' });
    });

    it('Successfully failed to retrieved the posts. (DataFormat Error) ', async () => {
      const groupId = 'abc';
      const page = 1;
      const res = (await request(app).get(`/api/group/${groupId}/post`).set('Cookie', cookie).query({
        page,
      }));
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({ error: 'The requested data format is not valid.' });
    });
  });

  describe('Test GET /api/group', () => {
    it('Successfully retrieved group lists. ', async () => {
      const page = 1;
      const res = (await request(app).get('/api/group').set('Cookie', cookie).query({
        page,
      }));
      const expectedResult = [
        {
          name: 'test-group1', member: 2,
        },
        {
          name: 'test-group2', member: 6,
        },
        {
          name: 'test-group3', member: 1,
        },
      ];
      const result = res.body.map((group) => ({
        name: group.name,
        member: group.member,
      }));
      expect(res.status).toEqual(200);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('Test POST /api/group/:group_id/post/:post_id/comment', () => {
    it('Successfully created the comment ', async () => {
      const groupId = 1;
      const postId = 1;
      const content = 'testComment';
      const res = (await request(app).post(`/api/group/${groupId}/post/${postId}/comment`).set('Cookie', cookie).send({
        content,
      }));

      expect(res.status).toEqual(201);
      expect(res.body).toEqual({ message: 'Successfully created the comment.' });
    });

    it('Successfully failed to create the comment (Group Not Found) ', async () => {
      const groupId = 10000;
      const postId = 1;
      const content = 'testComment';
      const res = (await request(app).post(`/api/group/${groupId}/post/${postId}/comment`).set('Cookie', cookie).send({
        content,
      }));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Group Not Found' });
    });

    it('Successfully failed to create the comment (Post Not Found) ', async () => {
      const groupId = 1;
      const postId = 10000;
      const content = 'testComment';
      const res = (await request(app).post(`/api/group/${groupId}/post/${postId}/comment`).set('Cookie', cookie).send({
        content,
      }));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Post Not Found' });
    });

    it('Successfully failed to create the comment (DataFormat Error) ', async () => {
      const groupId = 1;
      const postId = 1;
      const content = 123;
      const res = (await request(app).post(`/api/group/${groupId}/post/${postId}/comment`).set('Cookie', cookie).send({
        content,
      }));
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({ error: 'The requested data format is not valid.' });
    });
  });

  describe('Test PUT /api/group/:group_id/post/:post_id/comment/:comment_id', () => {
    const content = 'testComment';

    it('Successfully modified the comment ', async () => {
      const groupId = 1;
      const postId = 1;
      const commentId = 1;
      const res = (await request(app).put(`/api/group/${groupId}/post/${postId}/comment/${commentId}`).set('Cookie', cookie).send({
        content,
      }));

      expect(res.status).toEqual(200);
      expect(res.body).toEqual({ message: 'Successfully modified the comment.' });
    });

    it('Successfully failed to modified the comment (Group Not Found) ', async () => {
      const groupId = 10000;
      const postId = 1;
      const commentId = 1;
      const res = (await request(app).put(`/api/group/${groupId}/post/${postId}/comment/${commentId}`).set('Cookie', cookie).send({
        content,
      }));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Group Not Found' });
    });

    it('Successfully failed to modified the comment (Post Not Found) ', async () => {
      const groupId = 1;
      const postId = 10000;
      const commentId = 1;
      const res = (await request(app).put(`/api/group/${groupId}/post/${postId}/comment/${commentId}`).set('Cookie', cookie).send({
        content,
      }));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Post Not Found' });
    });

    it('Successfully failed to modified the comment (Comment Not Found) ', async () => {
      const groupId = 1;
      const postId = 1;
      const commentId = 10000;
      const res = (await request(app).put(`/api/group/${groupId}/post/${postId}/comment/${commentId}`).set('Cookie', cookie).send({
        content,
      }));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Comment Not Found' });
    });

    it('Successfully failed to modified the comment (DataFormat Error) ', async () => {
      const groupId = 1;
      const postId = 1;
      const commentId = 'abc';
      const res = (await request(app).put(`/api/group/${groupId}/post/${postId}/comment/${commentId}`).set('Cookie', cookie).send({
        content,
      }));
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({ error: 'The requested data format is not valid.' });
    });
  });

  describe('Test DELETE /api/group/:group_id/post/:post_id/comment/:comment_id', () => {
    it('Successfully deleted the comment ', async () => {
      const groupId = 1;
      const postId = 1;
      const commentId = 1;
      const res = (await request(app).delete(`/api/group/${groupId}/post/${postId}/comment/${commentId}`).set('Cookie', cookie));
      expect(res.status).toEqual(204);
    });

    it('Successfully failed to deleted the comment (Group Not Found) ', async () => {
      const groupId = 10000;
      const postId = 1;
      const commentId = 1;
      const res = (await request(app).delete(`/api/group/${groupId}/post/${postId}/comment/${commentId}`).set('Cookie', cookie));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Group Not Found' });
    });

    it('Successfully failed to deleted the comment (Post Not Found) ', async () => {
      const groupId = 1;
      const postId = 10000;
      const commentId = 1;
      const res = (await request(app).delete(`/api/group/${groupId}/post/${postId}/comment/${commentId}`).set('Cookie', cookie));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Post Not Found' });
    });

    it('Successfully failed to modified the comment (Comment Not Found) ', async () => {
      const groupId = 1;
      const postId = 1;
      const commentId = 10000;
      const res = (await request(app).put(`/api/group/${groupId}/post/${postId}/comment/${commentId}`).set('Cookie', cookie).send({
        content,
      }));
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({ error: 'Comment Not Found' });
    });

    it('Successfully failed to modified the comment (DataFormat Error) ', async () => {
      const groupId = 1;
      const postId = 1;
      const commentId = 'abc';
      const res = (await request(app).put(`/api/group/${groupId}/post/${postId}/comment/${commentId}`).set('Cookie', cookie).send({
        content,
      }));
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({ error: 'The requested data format is not valid.' });
    });
  });
});