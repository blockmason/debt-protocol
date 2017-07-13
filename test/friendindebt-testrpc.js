var FriendInDebt = artifacts.require("./FriendInDebt.sol");

var foundation = "0x38d9c595d3da9d5023ed01a29f19789bf02187ef";
var adminId = "timg";
var user2 = "timg";
var user3 = "jaredb";
var currency = "USDcents";

var b2s = function(bytes) {
    var s = "";
    for(var i=2; i<bytes.length; i+=2) {
        var num = parseInt(bytes.substring(i, i+2), 16);
        if (num == 0) break;
        var char = String.fromCharCode(num);
        s += char;
    }
    return s;
};

contract('FriendInDebt', function(accounts) {
    var account1 = accounts[0];
    var account2 = accounts[1];
    var account3 = accounts[2];

    var friends;
    it("add a friend, have pending, confirm friend, no more pending", function() {
        var fid;
        return FriendInDebt.new(adminId, foundation).then(function(instance) {
            fid = instance;
            return fid.addCurrencyCode(currency, {from: account2});
        }).then(function(v) {
            return fid.addFriend(user2, user3, {from: account2});
        }).then(function(v) {
            return fid.pendingFriends(user3);
        }).then(function(v) {
            friends = pendingFriends2Js(v.valueOf());
            assert.equal(friends[0].friendId, user2, "user2 not in the pending list");
            assert.equal(friends[0].confirmerId, user3, "user3 not in the ids to confirm list");
            return fid.pendingFriends(user2);
        }).then(function(v) {
            friends = pendingFriends2Js(v.valueOf());
            assert.equal(friends[0].friendId, user3, "user3 not in the pending list");
            assert.equal(friends[0].confirmerId, user3, "user3 not in the ids to confirm list");
            return fid.confirmedFriends(user2);
        }).then(function(v) {
            friends = confirmedFriends2Js(v.valueOf());
            assert.equal(friends.length, 0, "should not have confirmed friends");
            return fid.confirmedFriends(user3);
        }).then(function(v) {
            friends = confirmedFriends2Js(v.valueOf());
            assert.equal(friends.length, 0, "should not have confirmed friends");
            return fid.addFriend(user3, user2, {from: account3});
        }).then(function(v) {
            return fid.pendingFriends(user2);
        }).then(function(v) {
            friends = pendingFriends2Js(v.valueOf());
            assert.equal(friends.length, 0, "user2 should not have pending friends");
            return fid.pendingFriends(user3);
        }).then(function(v) {
            friends = pendingFriends2Js(v.valueOf());
            assert.equal(friends.length, 0, "user3 should not have pending friends");
            return fid.confirmedFriends(user3);
        }).then(function(v) {
            friends = confirmedFriends2Js(v.valueOf());
            assert.equal(friends[0].friendId, user2, "user3 should have confirmed friends");
            return fid.confirmedFriends(user2);
        }).then(function(v) {
            friends = confirmedFriends2Js(v.valueOf());
            assert.equal(friends[0].friendId, user3, "user2 should have confirmed friends");
        });
    });

    it("create debt; check,confirm it; create debt; check,reject it", function() {
        var fid;
        var amt1 = 2000;
        var amt2 = 3000;
        var desc1 = "stuff you bought";
        var desc2 = "bad things I owe for";

        var debts;
        return FriendInDebt.new(adminId, foundation).then(function(instance) {
            fid = instance;
            return fid.addCurrencyCode(currency, {from: account2});
        }).then(function(v) {
            return fid.addFriend(user2, user3, {from: account2});
        }).then(function(v) {
            return fid.addFriend(user3, user2, {from: account3});
        }).then(function(v) {
            return fid.newDebt(user2, user3, currency, amt1, desc1, {from: account2});
        }).then(function(v) {
            return fid.newDebt(user3, user2, currency, amt2, desc2, {from: account2});
        }).then(function(v) {
            return fid.pendingDebts(user2, user3);
        }).then(function(v) {
            debts = pendingDebts2Js(v.valueOf());
            assert.equal(debts[0].id, 0, "1st pending id not 0");
            assert.equal(debts[1].id, 1, "2nd pending id not 1");
            assert.equal(debts[0].confirmerId, user3, "user3 should be on the hook to confirm first debt");
            assert.equal(debts[0].creditor, user3, "1st debt creditor should be user3");
            assert.equal(debts[0].debtor, user2, "1st debt debtor should be user2");
            assert.equal(debts[1].creditor, user2, "2nd debt creditor should be user2");
            assert.equal(debts[1].debtor, user3, "2nd debt debtor should be user3");
            return fid.confirmDebt(user3, user2, debts[0].id, {from: account3});
        }).then(function(v) {
            return fid.pendingDebts(user3, user2);
        }).then(function(v) {
            return fid.pendingDebts(user2, user3);
        }).then(function(v) {
            debts = pendingDebts2Js(v.valueOf());
            assert.equal(debts.length, 1, "Should only have one pending debt left");
            return fid.rejectDebt(user3, user2, debts[0].id, {from: account3}); //reject it
        }).then(function(v) {
            return fid.pendingDebts(user2, user3);
        }).then(function(v) {
            debts = pendingDebts2Js(v.valueOf());
            assert.equal(debts.length, 0, "user2 should have no pending debts");
            return fid.confirmedDebts(user2, user3);
        }).then(function(v) {
            debts = confirmedDebts2Js(v.valueOf());
            assert.equal(debts.length, 1, "user2 should have 1 confirmed debt");
            assert.equal(debts[0].amount, amt1, "amount should be " + amt1);
        });
    });
});

var confirmedFriends2Js = function(friends) {
    var friendList = [];
    for ( var i=0; i < friends.length; i++ ) {
        var friend = {
            friendId: b2s(friends[i])
        };
        friendList.push(friend);
    }
    return friendList;
};

var pendingFriends2Js = function(friends) {
    var friendList = [];
    for ( var i=0; i < friends[0].length; i++ ) {
        var friend = {
            friendId: b2s(friends[0][i]),
            confirmerId: b2s(friends[1][i])
        };
        friendList.push(friend);
    }
    return friendList;
};

var pendingDebts2Js = function(debts) {
    var debtList = [];
    //debts[0] is all the debtIds, debts[1] is confirmerIds, etc
    for ( var i=0; i < debts[0].length; i++ ) {
        var debt = { id: debts[0][i].toNumber(),
                     confirmerId: b2s(debts[1][i]),
                     currency: b2s(debts[2][i]),
                     amount: debts[3][i].toNumber(),
                     desc: b2s(debts[4][i]),
                     debtor: b2s(debts[5][i]),
                     creditor: b2s(debts[6][i])  };
        debtList.push(debt);
    }
    return debtList;
};

var confirmedDebts2Js = function(debts) {
    var debtList = [];
    for ( var i=0; i < debts[0].length; i++ ) {
        var debt = { currency: b2s(debts[0][i]),
                     amount: debts[1][i].toNumber(),
                     desc: b2s(debts[2][i]),
                     debtor: b2s(debts[3][i]),
                     creditor: b2s(debts[4][i])  };
        debtList.push(debt);
    }
    return debtList;
};