import {
  Model, Sequelize, DataTypes,
  BelongsToManyAddAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
} from 'sequelize';
import User from './user';

export default class Group extends Model {
  public groupId!: number;

  public name!: string;

  public member!: number;

  public leader!: number;

  public inviteCode!: string | null;

  public inviteExp!: Date | null;

  declare addUser: BelongsToManyAddAssociationMixin<User, number>;

  declare getUsers: BelongsToManyGetAssociationsMixin<User>;

  declare hasUser: BelongsToManyHasAssociationMixin<User, number>;

  public static initiate(sequelize: Sequelize): void {
    Group.init({
      groupId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      member: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      leader: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      inviteCode: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      inviteExp: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    }, {
      sequelize,
      timestamps: false,
      modelName: 'Group',
      tableName: 'groups',
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  public static associate(db): void {
    db.Group.hasMany(db.GroupSchedule, {
      foreignKey: 'groupId',
      onDelete: 'cascade',
      allowNull: false,
    });
  }
}
