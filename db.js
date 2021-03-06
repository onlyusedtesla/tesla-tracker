const fs = require("fs");
const dbFileName = process.env.STAGING ? "data-staging.json" : "data.json";
const submissionsFileName = process.env.STAGING
  ? "submissions-staging.json"
  : "submissions.json";

const tables = ["favorites", "upvotes"];
const validKeys = [
  "title",
  "description",
  "url",
  "item_id",
  "tags",
  "link_type",
  "timestamp",
  "item_date"
];

// Check if the files exist and if they don't create them.

if (!fs.existsSync(__dirname + "/" + dbFileName)) {
  let data = {
    items: [],
    item_upvotes: {},
    user_favorite: {},
    user_upvotes: {},
    invite_codes: {},
    comments: [],
    users: {}
  };

  fs.writeFileSync(__dirname + "/" + dbFileName, JSON.stringify(data));
}

if (!fs.existsSync(__dirname + "/" + submissionsFileName)) {
  let data = {
    submissions: []
  };
  fs.writeFileSync(__dirname + "/" + submissionsFileName, JSON.stringify(data));
}

function createNecessaryKeys() {
  let rawData = fs.readFileSync(__dirname + "/" + dbFileName),
    data = JSON.parse(rawData);

  let requiredKeys = {
    items: [],
    item_upvotes: {},
    user_favorite: {},
    user_upvotes: {},
    invite_codes: {},
    comments: [],
    users: {}
  };

  for (const property in requiredKeys) {
    if (requiredKeys.hasOwnProperty(property)) {
      if (typeof data[property] === "undefined") {
        data[property] = requiredKeys[property];
      }
    }
  }

  saveFile(data);
}

function uuid() {
  return "xxxxxxxx".replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function saveFile(data) {
  fs.writeFileSync(__dirname + "/" + dbFileName, JSON.stringify(data));
}

function save(items) {
  let rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);
  data["items"] = data["items"].concat(items).sort(function(a, b) {
    // Turn your strings into dates, and then subtract them
    // to get a value that is either negative, positive, or zero.
    return new Date(b.item_date) - new Date(a.item_date);
  });
  saveFile(data);
}

function backupData() {
  let rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);
  fs.writeFileSync(
    __dirname +
      (process.env.staging
        ? "/backups/data-staging-backup-"
        : "/backups/data-backup") +
      new Date().getTime() +
      ".json",
    JSON.stringify(data)
  );
}

function backupSubmissions() {
  let rawData = fs.readFileSync(__dirname + "/submissions.json");
  let data = JSON.parse(rawData);
  fs.writeFileSync(
    __dirname +
      (process.env.staging
        ? "/backups/submissions-staging-backup-"
        : "/backups/submissions-backup-") +
      new Date().getTime() +
      ".json",
    JSON.stringify(data)
  );
}

function findSubmission(submission) {
  const rawData = fs.readFileSync(__dirname + "/" + submissionsFileName),
    data = JSON.parse(rawData),
    allSubmissions = data["submissions"],
    indexOfSubmission = allSubmissions.findIndex(
      i => i.title === submission.title && i.url === submission.url
    );
  return allSubmissions[indexOfSubmission];
}

function saveSubmission(submission) {
  let rawData = fs.readFileSync(__dirname + "/" + submissionsFileName);
  let data = JSON.parse(rawData);

  data.submissions = data.submissions || [];
  data.submissions.push(submission);

  try {
    backupSubmissions();
    fs.writeFileSync(
      __dirname + "/" + submissionsFileName,
      JSON.stringify(data)
    );
    return "Submission Saved Successfully";
  } catch {
    return new Error("An error occured while saving the submission.");
  }
}

function getAllItems() {
  let rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);
  return data["items"];
}

function itemExists(itemId) {
  let results = getAllItems().some(el => el.item_id === itemId);
  return results;
}

/*
 * @description - Returns the items based on a number.
 * - Used for AJAX calls from the home page's more button.
 * @parameter page:number - 1 will return the first 10 items. 2 will return the second 10 items, 3 will return the 3rd 10 items.. until there are no more items... */
function getItems(page) {
  const items = getAllItems();
  page = page >= 0 ? page : 0;
  return items.slice(page * 10, page * 10 + 10);
}

/*
 * @description - Returns an individual item based on an id.
 * - Used for when rendering the item contents on the /item page.
 * @parameter itemId:String
 */
function getItem(itemId) {
  if (itemExists(itemId)) {
    return getAllItems().filter(el => el.item_id === itemId)[0];
  } else {
    return null;
  }
}

function getItemsFromSearch(searchTerm) {
  const allItems = getAllItems();

  let items = [];

  for (let i = 0; i < allItems.length; i += 1) {
    if (
      allItems[i].title
        .trim()
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      allItems[i].description
        .trim()
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    ) {
      items.push(allItems[i]);
    }
  }

  return items;
}

/*
 * @description - TODO: I'll change the name of this func later.
 * @return Void
 */
function addFavoriteOrUpvote(tableName, userId, itemId) {
  const rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  if (typeof data["user_" + tableName][userId] === "undefined") {
    data["user_" + tableName][userId] = [];
  }

  if (
    !data["user_" + tableName][userId].some(function(el) {
      return el.item_id === itemId;
    })
  ) {
    console.log("I'm gonna push the thing up to the table");
    console.log("tableName", tableName);
    console.log("userId", userId);

    data["user_" + tableName][userId].push({
      item_id: itemId,
      action_date: Date.now()
    });

    // Add upvotes to the table name to be able to render it later.
    if (tableName === "upvotes") {
      if (typeof data["item_upvotes"][itemId] === "undefined") {
        data["item_upvotes"][itemId] = {};
      }

      data["item_upvotes"][itemId][userId] = true;
    }
  }

  saveFile(data);
}

function removeFavoriteOrUpvote(tableName, userId, itemId) {
  if (!tables.includes(tableName)) {
    return new Error("Please specify the correct table.");
  }

  const rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  if (typeof data["user_" + tableName][userId] === "undefined") {
    return false;
  }

  console.log(
    "data['user_' + tableName][userId]",
    data["user_" + tableName][userId]
  );

  if (
    data["user_" + tableName][userId].some(function(el) {
      return el.item_id === itemId;
    })
  ) {
    console.log("About to delete the thing.");
    console.log("tableName", tableName);

    let index = data["user_" + tableName][userId].findIndex(
      i => i.item_id === itemId
    );
    data["user_" + tableName][userId].splice(index, 1);

    // Go ahead and remove the userkey frrom the item_upvotes too.
    if (tableName === "upvotes") {
      delete data["item_upvotes"][itemId][userId];
    }
  } else {
    return false;
  }

  saveFile(data);
}

/*
 * @description - Gets all favorits for a specific user id.
 */
function getFavorites(userId) {
  return getFavoritesOrUpvotes("favorites", userId);
}

function getUpvotes(userId) {
  return getFavoritesOrUpvotes("upvotes", userId);
}

function getSubmissions(nickname) {
  return getAllItems().filter(el => el.submitted_by === nickname);
}

/*
 * @description - Returns the number of upvotes for a specific item
 * @return Number
 */
function getUpvoteCountForItem(itemId) {
  let rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  let result = undefined;

  // All items by default have 1 vote by default when it's created.
  if (typeof data["item_upvotes"][itemId] === "undefined") {
    result = 1;
  } else {
    result = Object.keys(data["item_upvotes"][itemId]).length + 1;
  }

  return result;
}

function getFavoritesOrUpvotes(tableName, userId) {
  let rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  if (typeof data["user_" + tableName][userId] !== "undefined") {
    return data["user_" + tableName][userId];
  } else {
    return [];
  }
}

function removeFavorite(userId, itemId) {
  return removeFavoriteOrUpvote("favorites", userId, itemId);
}

function addFavorite(userId, itemId) {
  return addFavoriteOrUpvote("favorites", userId, itemId);
}

function addUpvote(userId, itemId) {
  return addFavoriteOrUpvote("upvotes", userId, itemId);
}

function removeUpvote(userId, itemId) {
  return removeFavoriteOrUpvote("upvotes", userId, itemId);
}

function getComments(itemId) {
  let rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);
  let allCommentsForItem = data["comments"].filter(i => i.item_id === itemId);
  let commentMap = {};

  allCommentsForItem.forEach(
    comment => (commentMap[comment.comment_id] = comment)
  );

  allCommentsForItem.forEach(comment => {
    if (comment.parent_id !== null && comment.parent_id !== "null") {
      let parent = commentMap[comment.parent_id];
      (parent.replies = parent.replies || []).push(comment);
    }
  });

  return allCommentsForItem.filter(comment => {
    return comment.parent_id === null || comment.parent_id === "null";
  });
}

function addComment(comment) {
  let rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  let commentId = uuid();
  comment.comment_id = commentId;

  data["comments"].push(comment);

  try {
    saveFile(data);
    return commentId;
  } catch {
    return false;
  }
}

function commentExists(commentId) {
  const rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  return data["comments"].some(function(el) {
    return el.comment_id === commentId;
  });
}

/*
 * @description - Grabs all the comment upvotes for a specific user.
 */
function getCommentUpvotes(username) {
  // basically iterate through all the keys and if the userId exists then add that commentId to the array

  const rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  let results = [];

  for (let commentId in data["comment_upvotes"]) {
    console.log("commentId", commentId);
    if (data["comment_upvotes"].hasOwnProperty(commentId)) {
      for (let userNameForComment in data["comment_upvotes"][commentId]) {
        console.log("userIdForComment", userNameForComment);
        if (
          data["comment_upvotes"][commentId].hasOwnProperty(userNameForComment)
        ) {
          if (username === userNameForComment) {
            console.log("In here?");
            results.push(commentId);
          }
        }
      }
    }
  }

  return results;
}

function addCommentUpvote(userId, commentId) {
  const rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  if (typeof data["comment_upvotes"] === "undefined") {
    data["comment_upvotes"] = {};
  }

  if (
    data["comments"].some(function(el) {
      return el.comment_id === commentId;
    })
  ) {
    if (typeof data["comment_upvotes"][commentId] === "undefined") {
      data["comment_upvotes"][commentId] = {};
      data["comment_upvotes"][commentId][userId] = true;
    }
  }

  saveFile(data);
}

function removeCommentUpvote(userId, commentId) {
  const rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  if (
    data["comments"].some(function(el) {
      return el.comment_id === commentId;
    })
  ) {
    delete data["comment_upvotes"][commentId][userId];
  } else {
    return false;
  }

  saveFile(data);
}

/*
 * @description - Returns the number of comments for a specific item
 * @return Number
 */
function getCommentCountForItem(itemId) {
  let rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);
  return data["comments"].filter(i => i.item_id === itemId).length;
}

/*
 * @description - Checks to see if a user profile exists, if not, then it creates a new one.
 * @param user:Object - an object with all the user information.
 */

function saveUserProfile(user) {
  const rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  if (typeof data["users"] === "undefined") {
    data["users"] = {};
  }

  if (typeof data["users"][user.nickname] === "undefined") {
    data["users"][user.nickname] = user;
    saveFile(data);

    try {
      saveFile(data);
      return true;
    } catch {
      return false;
    }
  }
}

/*
 * @description - This one is meant to be used in the user profile page to display the comments in a flat structure.
 * @param userId:String - The user id to get the comments for.
 */
function getCommentsForProfile(userId) {
  let rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);
  console.log("What are the comments?");
  console.log(data["comments"]);
  return data["comments"].filter(
    i => i.author === userId && itemExists(i.item_id)
  );
}

/*
 * @description - What this one does is gets the actual items that have been favorited by a specific user.
 */
function getFavoritesForProfile(userId) {
  let favorites = getFavorites(userId);
  let items = [];

  for (let i = 0; i < favorites.length; i += 1) {
    items.push(getItem(favorites[i].item_id));
  }

  return items.filter(el => el !== null);
}

/*
 * @description - This one gets the items that have been favorited by a specific user.
 */
function getUpvotesForProfile(userId) {
  let upvotes = getUpvotes(userId);
  let items = [];

  for (let i = 0; i < upvotes.length; i += 1) {
    items.push(getItem(upvotes[i].item_id));
  }

  return items.filter(el => el !== null);
}

/*
 * @description - Gets the karma points for a specific user. This is based on the total amount of upvotes on an article submitted by that user and also the total amount of upvotes their comments have.
 * @param userId:String - The user's nickname.
 * @return karmaPoints:Integer
 */
function getKarmaPointsForProfile(userId) {
  const rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  var userSubmissions = undefined;
  var comments = undefined;
  var commentIds = [];
  var itemIds = [];
  var itemPoints = 0;

  if (typeof data["items"] !== "undefined") {
    userSubmissions = data["items"].filter(function(item) {
      if (typeof item.submitted_by !== "undefined") {
        return item.submitted_by === userId;
      } else {
        return false;
      }
    });
  }

  if (typeof data["comments"] !== "undefined") {
    comments = data["comments"].filter(function(comment) {
      return comment.author === userId;
    });
  }

  if (userSubmissions && userSubmissions.length >= 1) {
    itemIds = userSubmissions.map(function(el) {
      return el.item_id;
    });
  }

  if (comments && comments.length >= 1) {
    commentIds = comments.map(function(el) {
      return el.comment_id;
    });
  }

  for (let i = 0; i < itemIds.length; i += 1) {
    if (
      typeof data["item_upvotes"] !== "undefined" &&
      typeof data["item_upvotes"][itemIds[i]] !== "undefined"
    ) {
      itemPoints += Object.keys(data["item_upvotes"][itemIds[i]]).length;
    }
  }

  for (let i = 0; i < commentIds.length; i += 1) {
    if (
      typeof data["comment_upvotes"] !== "undefined" &&
      typeof data["comment_upvotes"][commentIds[i]] !== "undefined"
    ) {
      itemPoints += Object.keys(data["comment_upvotes"][commentIds[i]]).length;
    }
  }

  return itemPoints;
}

/*
 * @description - Update an existing user's profile
 * @param user:Object - An object with various params related to the user.
 */
function updateUserProfile(user) {
  const rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  if (typeof data["users"][user.author] !== "undefined") {
    data["users"][user.author].about = user.about;
    data["users"][user.author].ownedTeslaModel = user.ownedTeslaModel;

    if (
      data["users"][user.author].ownedTeslaModel === "I don't own a Tesla, yet."
    ) {
      delete data["users"][user.author].ownedTeslaModel;
    }

    // Do some checks for the invite code here
    // Set an invited_by property on the user and if it's exists then you will

    if (
      user.inviteCode &&
      user.inviteCode.length >= 1 &&
      typeof data["users"][user.author].invited_by === "undefined" &&
      typeof data["invite_codes"][user.inviteCode] !== "undefined" &&
      data["invite_codes"][user.inviteCode].accepted_by == null
    ) {
      data["invite_codes"][user.inviteCode].accepted_by = user.author;
      data["users"][user.author].invited_by =
        data["invite_codes"][user.inviteCode].generated_by;
      generateInviteCodes(5, user.author);
    }

    try {
      saveFile(data);
      return true;
    } catch {
      return false;
    }
  }
}

function findUser(userId) {
  const rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);
  return data["users"][userId];
}

/*
 * @description - Generates an N amount of invitation codes.
 * @n:Integer - A positive integer of the number of codes to generate.
 */
function generateInviteCodes(n, username) {
  const rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  n = n || 1;

  // Creating the key if it doesn't yet exist.
  if (typeof data["invite_codes"] === "undefined") {
    data["invite_codes"] = {};
  }

  for (let i = 0; i < n; i += 1) {
    data["invite_codes"][uuid() + "-" + uuid()] = {
      generated_by: username || null,
      accepted_by: null
    };
  }

  saveFile(data);
}

/*
 * @description - Get all unused invitation codes.
 */
function getInviteCodes() {
  const rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  return Object.keys(data["invite_codes"]).filter(
    el => data["invite_codes"][el].accepted_by === null
  );
}

/*
 * @description - Gets all invitiation codes, accepted and not, for a specific user.
 */
function getUserInviteCodes(username) {
  const rawData = fs.readFileSync(__dirname + "/" + dbFileName);
  let data = JSON.parse(rawData);

  let results = [];

  for (const [key, value] of Object.entries(data["invite_codes"])) {
    if (value.generated_by === username) {
      results.push({
        ...value,
        invite_code: key
      });
    }
  }

  return results;
}

module.exports = {
  save: save,
  createNecessaryKeys: createNecessaryKeys,

  getItems: getItems,
  getItem: getItem,
  getAllItems: getAllItems,
  getItemsFromSearch: getItemsFromSearch,
  itemExists: itemExists,

  addFavorite: addFavorite,
  getFavorites: getFavorites,
  removeFavorite: removeFavorite,

  addUpvote: addUpvote,
  removeUpvote: removeUpvote,
  getUpvotes: getUpvotes,
  getUpvoteCountForItem: getUpvoteCountForItem,

  getComments: getComments,
  addComment: addComment,
  getCommentCountForItem: getCommentCountForItem,

  addCommentUpvote: addCommentUpvote,
  removeCommentUpvote: removeCommentUpvote,
  getCommentUpvotes: getCommentUpvotes,
  commentExists: commentExists,

  saveSubmission: saveSubmission,
  findSubmission: findSubmission,
  getSubmissions: getSubmissions,
  validKeys: validKeys,
  uuid: uuid,

  saveUserProfile: saveUserProfile,
  updateUserProfile: updateUserProfile,
  findUser: findUser,

  getCommentsForProfile: getCommentsForProfile,
  getFavoritesForProfile: getFavoritesForProfile,
  getUpvotesForProfile: getUpvotesForProfile,
  getKarmaPointsForProfile: getKarmaPointsForProfile,

  generateInviteCodes: generateInviteCodes,
  getUserInviteCodes: getUserInviteCodes,
  getInviteCodes: getInviteCodes,

  backupData: backupData,
  backupSubmissions: backupSubmissions
};
