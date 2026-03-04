module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define('File', {
    ID: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    OriginalName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    StoredName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    MimeType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Category: {
      type: DataTypes.ENUM('audio', 'images'),
      allowNull: false,
      defaultValue: 'audio',
    },
    FilePath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  });

  return File;
};
