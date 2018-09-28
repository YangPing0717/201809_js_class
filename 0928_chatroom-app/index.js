$(function () {

    var currentUser;
    var chatsRef = db.collection("chatrooms").doc("chatroom");
    //定義登入供應商
    var provider = new firebase.auth.GoogleAuthProvider();

    //登入按鈕
    $("#login-btn").click(function () {
        firebase.auth().signInWithPopup(provider).then(function (result) {
            // This gives you a Google Access Token. You can use it to access the Google API.
            var token = result.credential.accessToken;
            // The signed-in user info.
            var user = result.user;
        }).catch(function (error) {
            console.log(error);
        });
    });

    //登出按鈕
    $("#logout-btn").click(function () {
        firebase.auth().signOut().then(function () {
            // Sign-out successful.
            alert("已登出");
            chatsRef.collection('users').doc(currentUser.uid)
            .delete().then(function(){
                location.reload();
            })
        }).catch(function (error) {
            // An error happened.
        });
    });

    //登入登出狀態監測
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            // User is signed in.
            currentUser = {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoUrl: user.photoURL
            }
            chatsRef.collection('users')
            .doc(currentUser.uid)
            .doc(currentUser);

            $("#login-btn").addClass("hidden");
            $("#logout-btn").removeClass("hidden");
            $("#user-photo").attr("src", user.photoURL);
            $("#user-name").text(user.displayName);

            //監控input框有沒有人在打字
            $("#message-input").on("input", function () {
                if ($("#message-input").val() != "") {
                    //輸入框上面有字
                    chatsRef.update({
                        typing: true
                    });
                } else {
                    chatsRef.update({
                        typing: false
                    });
                }
            });
            //游標離開input框
            $("#message-input").focusout(function () {
                chatsRef.update({
                    typing: false
                });
            });

            //即時監控資料庫的typing欄位
            chatsRef.onSnapshot(function (doc) {
                var chatroom = doc.data();
                if (chatroom.typing) {
                    $("#typing").removeClass("hidden");
                } else {
                    $("#typing").addClass("hidden");
                }
            });

            //按enter鍵送訊息
            $("#message-input").keyup(function (e) {
                if (e.keyCode == 13) {
                    uploadTextMessage();
                }
            });

            //按送出按鈕傳訊息
            $("#send-btn").click(function () {
                uploadTextMessage();
            });

            //把聊天記錄繪製到網頁上
            chatsRef.collection("chats").orderBy("time", "asc")
                .onSnapshot(function (docs) {
                    docs.docChanges().forEach(function (change) {
                        if (change.type == "added") {
                            var chat = change.doc.data();
                            //大頭貼
                            var html = `<img class="chat-user-photo" src="${chat.user.photoUrl}" alt="${chat.user.displayName}">`;
                            //加上聊天內容
                            if (chat.contentType == "text") {
                                //文字訊息：直接串上文字
                                html += chat.message;
                            } else {
                                //圖片訊息：先套img標籤
                                html += `<img src='${chat.message}' width='150px'>`;
                            }
                            //新增li標籤，將模板設定到li裡面，再append到網頁上
                            $("<li>").html(html).appendTo($("#chats"));
                            // 讓 scroll bar 置底
                            var chatUlHeight = $('#chats').prop('scrollHeight');
                            $('#chats').scrollTop(chatUlHeight);
                        }
                    });
                });

            // 監控是否上傳圖片
            var imgFile;
            $('#img-input').change(function(e){
                console.log(e);
                imgFile = e.target.files[0];
                $('.custom-file-label').text(imgFile.name);
            })

            // 避免圖片被拖拉進視窗
            $('#chat-window').on('drag dragstart dragover dragend dragleave drop', function(e){
                e.preventDefault(); // 避免掉上面的狀況
            }).on('dragenter dragover', function(){
                $(this).css('background-color', '#ddd')
            }).on('dragend dragleave drop', function(){
                $(this).css('background-color', '#000')
            }).on('drop', function(e){
                var imageFiles = e.originalEvent.dataTransfer.files;
                Object.keys(imageFiles).forEach(function(key){
                    var imgFile = imgFile
                })
            })


        } else {
            // No user is signed in .
            $("#login-btn").removeClass("hidden");
            $("#logout-btn").addClass("hidden");
            $("#user-photo").attr("src", "");
            $("#user-name").text("");
        }
    });

    //上傳文字訊息
    function uploadTextMessage() {
        //輸入框有文字
        var msg = $("#message-input").val();
        if (msg != "") {
            //把文字內容、訊息型態、上傳者資料、時間
            var data = {
                message: msg,
                contentType: "text",
                user: currentUser,
                time: new Date().getTime()
            };
            //把聊天記錄存到資料庫
            chatsRef.collection("chats").add(data);
            //文字框清除
            $("#message-input").val("");
            //把打字狀態更新為false
            chatsRef.update({
                typing: false
            });
            // 上船文字後 檢查 img-input 框內有無圖片
            if($('$img-input').val()!=''){
                uploadImageMessage(imgFile);
            }
        }

        // 如果文字框沒有文字 但是有上傳要上傳
        if(msg == ''&& $('$img-input').val() != ''){
            uploadImageMessage(imgFile);
        }
    }

    //上傳圖片訊息
    function uploadImageMessage(imgFile){
        var time = new Date().getTime();
        var fileName = imgFile.name + time;
        var storageRef = storage.ref();
        var imageRef = storageRef.child(fileName);
        imageRef.put(imgFile).then(function(img){
            // 拿到圖片下載連結
            imageRef.getDownloadURL().then(function(url){
                // 新增聊天訊息 圖片網址 訊息類型 上船者資料 時間
                var data = {
                    message: url,
                    contentType: 'image',
                    user: currentUser,
                    time: time,
                };
                // 存到 chats 集合裡
                chatsRef.collection('chats').add(data);
                // 將 label 文字還原 將圖片資訊從 input 中清除
                $('.custom-file-label').text('choose file')
                $('#img-input').val('');
            })
        });
    }



});