// JScript File

//Constants
var SUCCESS		= 0;
var ERROR		= 1;
var NOT_READY	= 2;//Need to wait for more resources
var RETRY		= 3;//未打开


//Class BaseWorkflow
function BaseWorkflow() {
	//Constructor, put Member Variables here.
	this.callerObj  = null;
	this.callbackFunction = null;
	this.status = null;
}
BaseWorkflow.Extends(null, {
	//Prototype, put Member Functions here.
	run:	function(callerObj, callbackFunction) {
		this.callerObj  = callerObj;
		this.callbackFunction = callbackFunction;
		this.start();
	}
	,
	start:	function() {
	}
	,
	end:	function(status) {
		this.status = status;
		if (this.callbackFunction)
			this.callbackFunction.apply(this.callerObj, [this]);//arguments
	}
});
//****** end of Class ******


//Class BaseHttpAction
function BaseHttpAction(villageId) {
	//Constructor, put Member Variables here.
	this.Super = BaseWorkflow;
	this.Super();
	
	this.villageId = villageId;
	this.serverURL = "http://" + g_sServerURL + "/";
	this.ajaxReq = new AjaxRequestText();
}
BaseHttpAction.Extends(BaseWorkflow, {
	//Prototype, put Member Functions here.
	sendRequest:	function(url, params, nextStep) {
		if (this.villageId) {
			url += (url.indexOf("?") > 0) ? "&" : "?";
			url += "newdid=" + this.villageId;
		}
		this.ajaxReq.send( this.serverURL+url, params, this, nextStep );
		//if (params)
		//	postDebug("params="+params);
	}
});
//****** end of Class ******


//Class LoginAction
function LoginAction(villageId, username, password) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);
	
	this.username = username;
	this.password = password;
}
LoginAction.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start:	function() {
		postMessage("登录:"+ this.username);
		this.sendRequest("login.php", null, this.loginAction1);
	}
	,
	loginAction1:	function(doc) {
		var form = getStrBetween(doc, '<form method="post" name="snd" action="dorf1.php">', '</form>',2000);
		if (form.length == 0) {
			postError("未打开 登录 页面");
			this.end(ERROR);
			return;
		}
		
		var param = "";
		for (var i=0; i<7; i++) {
			var input = getStrBetween(form, "<input ", ">", 500);
			var type = getStrBetween(input, 'type="', '"', null);
			var name = getStrBetween(input, 'name="', '"', null);
			var value = getStrBetween(input, 'value="', '"', null);
			if (type == "hidden" || type == "text" || type == "password") {
				if (type == "text")
					value = this.username;
				if (type == "password")
					value = this.password;
				param += name+"="+value+"&";
			}
			if (type == "Checkbox") {
				param += name+"="+value;
			}
			form = startFromStr(form, input, 2000);
		}
		
		this.sendRequest("dorf1.php", param, this.loginAction2);
	}
	,
	loginAction2:	function(doc) {
		if (doc.indexOf("密码错误") >= 0) {
			postError("密码错误");
			this.end(ERROR);
			return;
		}
		if (doc.indexOf("用户名不存在") >= 0) {
			postError("用户名不存在");
			this.end(ERROR);
			return;
		}
		if (doc.indexOf("下次自动登入") >= 0) {//登录失败
			postError("登录失败");
			this.end(ERROR);
			return;
		}
		
		postMessage("登录成功");
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******


//Class CheckLoginAction
function CheckLoginAction(villageId, username, password) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);
	
	this.username = username;
	this.password = password;
}
CheckLoginAction.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start:	function() {
		postDebug("CheckLoginAction: "+ this.username, this);
		this.sendRequest("dorf3.php", null, this.action1);
	}
	,
	action1:	function(doc) {
		if (doc.indexOf("下次自动登入") >= 0) {//Goto LoginAction
			var action = new LoginAction(null, this.username, this.password);
			action.run(this, this.loginResult);
			return;
		}
		if (doc.indexOf("dorf1.php?ok") >= 0) {
			postError("服务器贴出公告，请先阅读确认，再来重新开始机器人");
			this.end(ERROR);
			return;
		}

		if (doc.indexOf('<a href="dorf3.php">概况</a>') >= 0) {
			postMessage("Check Login 正常");
			this.end(SUCCESS);
			return;
		} else {
			postError("Check Login 未知错误");
			this.end(ERROR);
			return;
		}
	}
	,
	loginResult:	function(action) {
		this.end(action.status);//SUCCESS or ERROR
	}
});
//****** end of Class ******


//Class BuildAction
function BuildAction(villageId, buildingId) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);
	
	this.buildingId = buildingId;
}
BuildAction.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start:	function() {
		postDebug("准备建: "+ this.buildingId +" 号", this);
		this.sendRequest("build.php?id="+this.buildingId, null, this.buildAction1);
	}
	,
	buildAction1:	function(doc) {
		if (doc.indexOf('<span class="c">资源不足</span>') >= 0 || doc.indexOf('资源何时充足时间提示') >= 0) {
			postMessage("资源不足");
			this.end(NOT_READY);
			return;
		}
		if (doc.indexOf("已经有建筑在建造中") >= 0 || doc.indexOf("等待队列中") >= 0) {
			postMessage("已经有建筑在建造中");
			this.end(NOT_READY);
			return;
		}
		if (doc.indexOf("粮食产量不足: 需要先建造一个农场") >= 0) {
			postError("粮食产量不足: 需要先建造一个农场");
			this.end(ERROR);
			return;
		}
		if (doc.indexOf("建造所需资源超过仓库容量上限,请先升级你的仓库") >= 0) {
			postError("建造所需资源超过仓库容量上限,请先升级你的仓库");
			this.end(ERROR);
			return;
		}
		if (doc.indexOf("建造完成") >= 0 || doc.indexOf("将马上开始全部建造") >= 0) {
			postError("建造完成");
			this.end(ERROR);
			return;
		}
		
		var info;
		if (doc.indexOf("dorf1.php?a=") >= 0) {
			//Building Outer Town
			info = getStrBetween(doc, "dorf1.php?a=", '">', null);//<a href="dorf1.php?a=12&c=5a1">升级到等级4</a>
			this.sendRequest("dorf1.php?a="+info, null, this.buildAction2);
		} else if (doc.indexOf("dorf2.php?a=") >= 0) {
			//Building inner Town
			info = getStrBetween(doc, "dorf2.php?a=", '">', null);//<a href="dorf2.php?a=29&c=cf1">升级到等级5</a>
			this.sendRequest("dorf2.php?a="+info, null, this.buildAction2);
		} else {
			postMessage("未打开 建筑/矿田 页面,信息: "+ getStrBetween(doc, '<span class="c">', '</span>', null) );//<span class="c">资源不足</span>
			this.end(RETRY);
			return;
		}
		
		info = getStrBetween(doc, "<h1><b>", '</b></h1>', null);//<h1><b>农场 等级 3</b></h1>
		postMessage("升级 "+ this.buildingId +" 号建筑: "+ info);
	}
	,
	buildAction2:	function(doc) {
		if (doc.indexOf("建造中") < 0) {
			postMessage("未打开 建造成功 页面");
		}
		this.doc = doc;//returns doc to BuildVillageAction
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******


//Class BuildVillageAction
function BuildVillageAction(villageId, buildQueue) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);

	this.buildQueue = buildQueue;
	this.buildId    = null;
	this.busySeconds = 0;
}
BuildVillageAction.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start:	function() {
		if (this.buildQueue && this.buildQueue.length>0) {
			this.buildId = this.buildQueue[0];
		} else {
			this.buildId = null;//if no specified ID, auto build resources.
		}
		
		var url;
		if ( 1 <=this.buildId && this.buildId<= 18 || this.buildId == null ) {
			url = "dorf1.php";
		} else if ( 19 <=this.buildId && this.buildId<= 40 ) {
			url = "dorf2.php";
		} else {
			postError("建筑ID错误 "+this.buildId);
			this.end(ERROR);
			return;
		}
		
		if (g_romeBuild == 1 && this.buildId == null) {//罗马内城
			postError("罗马内城建设队列完毕");
			this.end(ERROR);
			return;
		}
		if (g_romeBuild == 1 && this.buildId <= 18) {//罗马内城
			postError("建筑ID错误 "+this.buildId +" 不属于罗马内城");
			this.end(ERROR);
			return;
		}
		if (g_romeBuild == 2 && this.buildId > 18) {//罗马外城
			postError("建筑ID错误 "+this.buildId +" 不属于罗马外城");
			this.end(ERROR);
			return;
		}
		
		postDebug("准备建村庄: "+ this.villageId, this);
		this.sendRequest(url, null, this.action1);
	}
	,
	action1:	function(doc) {
		if (doc.indexOf("<map name=") < 0) {//<map name="rx"> or <map name="map1">
			postMessage("未打开 村庄 页面");
			this.end(RETRY);
			return;
		}

		//In Building or Not
		this.busySeconds = 0;
		if (doc.indexOf("建造中") >= 0) {
			var info = startFromStr(doc, "建造中", 2000);
			var name;
			while (true) {
				name  = getStrBetween(info, '"取消"></a></td><td>', '</td>', null);//<table ...><tr><td>...title="取消"></a></td><td>市场 (等级 14)</td>...
				if (name == "")
					break;//not found
				var inner = true;
				if (name.indexOf("伐木场") >= 0 || name.indexOf("黏土矿") >= 0 || name.indexOf("铁矿场") >= 0 || name.indexOf("农场") >= 0)
					inner = false;
				if (g_romeBuild == 0 || (g_romeBuild == 1 && inner) || (g_romeBuild == 2 && !inner))
					break;//found
				info = startFromStr(info, ' 点</td></tr>', 2000);//try next item
			}
			if (name != "") {
				var time = getStrBetween(info, "<span id=timer", "</span>", null);//<span id=timer1>0:29:45</span> 小时	timer2	timer3
				time = startFromStr(time, ">", 200);//1>0:29:45
				if (time.indexOf("Popup(2,5)") >= 0) {//<a href="#" onClick="Popup(2,5);return false;"><span class="c0t">0:00:0<br/>
					time = "服务器 - 事件过多，瞬间阻塞 (00:00:0?)"
					this.busySeconds = RETRY_SEC;//wait 5 more seconds, will be 10 total
				} else {
					this.busySeconds = parseTime(time);
				}
				postMessage("建造中: "+ name +" 还需: "+ time);
				
				this.end(SUCCESS);
				return;
			}
		}
		
		//If has Queue
		if (this.buildId) {
			var action = new BuildAction(this.villageId, this.buildId);
			action.run(this, this.buildResult);
			return;
		}
		
		//otherwise auto build resources.
		updateData(doc);
		printStatus();

		var leastType = getLeastType();
		var mineId = getLowestMine(leastType);
		if (mineId) {
			var action = new BuildAction(this.villageId, mineId);
			action.run(this, this.buildResult);
			return;
		} else {
			this.end(ERROR);
			return;
		}
	}
	,
	buildResult:	function(action) {
		if (action.status == SUCCESS) {
			//Remove id from buildQueue, if it is the first of the queue.
			var id = action.buildingId;
			var queue = this.buildQueue;
			if (queue.length > 0 && queue[0] == id) {
				for (i = 0; i < queue.length - 1; i++) {
					queue[i] = queue[i + 1];
				}
				queue.length -= 1;
				postDebug("remove "+id+" from Queue. now Queue length = "+queue.length, this);
			}

			this.action1(action.doc);
		} else {
			this.end(action.status);//ERROR or NOT_READY or RETRY
		}
	}
});
//****** end of Class ******


//Class AttackAction
function AttackAction(villageId, target, troops, type, catapult1, catapult2) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);
	
	//attack parameters
	this.target = target;
	this.troops = troops;
	this.type   = type;
	this.catapult1 = catapult1;//optional, can be null
	this.catapult2 = catapult2;//optional, can be null
	
	//more parameters for preciseAttack
	this.time     = null;
	this.timeDiff = null;
	
	//results
	this.iAttackDuration = 0;
	this.targetVillage = null;
	//result for preciseAttack
	this.waiting = null;
}
AttackAction.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start:	function() {
		postDebug("准备出兵", this);
		this.sendRequest("a2b.php", null, this.action1);
	}
	,
	action1:	function(doc) {
		if (doc.indexOf("<h1>出兵</h1>") < 0) {
			postMessage("未打开 出兵 页面");
			this.end(RETRY);
			return;
		}

			
		var param = "";
		var troops = this.troops;
		for (property in troops) {//property = "t1"
			//<input type="text" class="text disabled" name="t1" value="" maxlength="6" />				
			var info = startFromStr(doc, 'name="'+property+'"', 200);//t1 方阵
			var iCount = parseDecimal( getStrBetween(info, ">(", ")<", null) );

			var min;
			var max;
			if ( troops[property] instanceof Array ) {
				min = troops[property][0];
				max = troops[property][1];
			} else if ( !isNaN(troops[property]) ) {
				min = troops[property];
				max = troops[property];
			} else {
				postError("部队类型 "+property+" 输入数量错误:"+troops[property]);
				this.end(ERROR);
				return;
			}
			if ( iCount < min ) {
				postMessage("士兵不够,等待,现有 "+property+" "+iCount+"个");
				this.end(NOT_READY);
				return;
			}
			if ( iCount > max )
				iCount = max;
			param += property+"="+iCount+"&";//t1=100&
		}

		info = startFromStr(doc, 'name="timestamp"', 30);//t1 方阵
		var timestamp = getStrBetween(info, 'value="', '" />', null);

		info = startFromStr(doc, 'name="timestamp_checksum"', 20);//t1 方阵
		var timestamp_checksum = getStrBetween(info, 'value="', '" />', null);

		var coord = getCoordinate(this.target);
		param += "b=1&";//hidden param
		param += "timestamp="+timestamp+"&";//hidden param
		param += "timestamp_checksum="+timestamp_checksum+"&";//hidden param
		param += "c="+this.type+"&";//方式:3普通/侦察 4抢夺
		param += "x="+coord.x+"&";//坐标x
		param += "y="+coord.y+"&";//坐标y
		param += "dname=";//村庄名字

		postMessage("出兵:　"+this.target);//(-183|-164)

		this.sendRequest("a2b.php", param, this.action2);
	}
	,
	action2:	function(doc) {
		if (doc.indexOf("在这个坐标没有任何村庄") >= 0) {
			postMessage("在这个坐标没有任何村庄");
			this.end(SUCCESS);
			return;
		}
		if (doc.indexOf("帐户因为违规而被冻结") >= 0) {
			postMessage("帐户因为违规而被冻结");
			this.end(SUCCESS);
			return;
		}
		if (doc.indexOf("帐户未被激活") >= 0) {
			postMessage("帐户未被激活");
			this.end(SUCCESS);
			return;
		}
		if (doc.indexOf("初级玩家保护期") >= 0) {
			postMessage("初级玩家保护期"+getStrBetween(doc, "初级玩家保护期", "</span>", null));//初级玩家保护期到 07/07/26 于 19:49:10</span>
			this.end(SUCCESS);
			return;
		}

		if (doc.indexOf("("+this.target+")") < 0) {//(-183|-164)
			postMessage("未打开 出兵确认 页面");
			this.end(RETRY);
			return;
		}

		if (doc.indexOf("占领的村庄") >= 0) {
			postMessage("占领的村庄，跳过");
			this.end(SUCCESS);
			return;
		}

		var sAttackDuration = getStrBetween(doc, "需时 ", " ", null);//需时 0:13:01 
		this.iAttackDuration = parseTime(sAttackDuration);

		var form = getStrBetween(doc, '<form method="post" action="a2b.php">', '</form>', 10000);
		var param = "";

		if (form.indexOf('<select name="kata"')  >= 0) {//(准备以投石车攻击)
			param += "kata=" +this.catapult1+"&";
			param += "kata2="+this.catapult2+"&";
		}

		for (var i=0; i<17; i++) {
			var input = getStrBetween(form, "<input", ">", 500);
			var type = getStrBetween(input, 'type="', '"', null);
			var name = getStrBetween(input, 'name="', '"', null);
			var value = getStrBetween(input, 'value="', '"', null);
			if (type == "hidden" || type == "text") {
				param += name+"="+value+"&";
			}
			if (type == "Radio" && name == "spy") {//侦察
				i--;//this is an additional input of the regular attack form
				if (value == "2")//1 侦察敌方现有资源和军队; 2 侦察敌方防守部署和军队
					param += name+"="+value+"&";
			}
			form = startFromStr(form, input, 2000);
		}

		if (form.indexOf('speed_artefact') >= 0){
			var input = getStrBetween(form, "<input ", ">", 500);
			var type = getStrBetween(input, 'type="', '"', null);
			var name = getStrBetween(input, 'name="', '"', null);
			var value = getStrBetween(input, 'value="', '"', null);
			param += "speed_artefact=" + value + "&"
		}

		var info = getStrBetween(doc, "<h1>", "</h1>", 10000);//<h1>对玩家鼎盛东辑事厂的侦察</h1> 的攻击 的抢夺
		if (info.substr(0,3) == "对玩家") {
			this.targetVillage = info.substr(3, info.length-6);//鼎盛东辑事厂
		} else if (info == "侦察绿洲") {
			this.targetVillage = "绿洲";
		}

		if (this.time == null) {// for Attack Action
			postMessage("确认 "+info+" 需时: "+sAttackDuration+" 小时 * 2");
			this.sendRequest("a2b.php", param, this.action3);
			return;
		} else {				// for Precise Attack
			postMessage(info+" 路程需时: "+sAttackDuration+" 小时");
			var iTime  = parseTime(this.time.substr(0, 8)) + parseDecimal(this.time.substr(9, 1)) * 0.1;  //11:32:01.5
			var iStart = iTime - this.iAttackDuration;
			var nowStr = getTimeStr(new Date());
			var iNow   = parseTime(nowStr.substr(0, 8)) + parseDecimal(nowStr.substr(9, 3)) * 0.001;//11:32:01.005
			this.waiting = (iStart - iNow) * 1000;
			while (this.waiting < 0)
				this.waiting += 86400000;//24 hours
			if (this.timeDiff == null || this.waiting > 300000) {// > 5 mins
				postMessage( "出兵前还需: "+ Math.floor(this.waiting/1000) +"秒" );
				this.end(NOT_READY);
				return;
			}
			// < 5 mins, 准备精确的倒计时
			this.waiting -=  this.timeDiff;
			var timer = new Timer(this, this.preciseAttack, [param]);
			timer.setTimer(this.waiting);
			postMessage( "倒计时: "+ this.waiting/1000 +"秒" );
			return;
		}
	}
	,
	action3:	function(doc) {
		if (doc.indexOf("集结点是村落士兵集合的地方") < 0) {
			postMessage("未打开 出兵成功 页面");
			this.end(RETRY);
			return;
		}
		this.end(SUCCESS);
		return;
	}
	,
	preciseAttack:	function(param) {
		this.sendRequest("a2b.php", param, this.action3);
		postMessage("压秒: "+this.time);
	}
});
//****** end of Class ******


//Class AttackTimer
function AttackTimer(villageId, target, troops, type, time, catapult1, catapult2) {
	//Constructor, put Member Variables here.
	this.Super = BaseWorkflow;
	this.Super();
	
	this.villageId = villageId;
	this.target    = target;
	this.troops    = troops;
	this.type      = type;
	this.time      = time;
	this.catapult1 = catapult1;
	this.catapult2 = catapult2;
}
AttackTimer.Extends(BaseWorkflow, {
	//Prototype, put Member Functions here.
	start:	function() {
		var action = new AttackAction(this.villageId, this.target, this.troops, this.type, this.catapult1, this.catapult2);
		action.time = this.time;
		action.run(this, this.attackResult);
	}
	,
	attackResult:	function(action) {
		if (action.status == SUCCESS) {
			this.end(SUCCESS);
			return;
		} else if (action.status == NOT_READY) {
			var waiting;
			if (action.waiting) {
				waiting = action.waiting - TimeDiffManager.EVAL_IN_ADVANCE;//提前准备 getTimeDiff()
				if (waiting < 1000)
					waiting = 1000;
				var timer = new Timer(this, this.timeDiffStart, []);
				timer.setTimer(waiting);
				return;
			} else {
				waiting = 600000;//没有士兵等情况 10 mins 重试
				var timer = new Timer(this, this.start, []);
				timer.setTimer(waiting);
				return;
			}
		} else if (action.status == RETRY) {
			var action = new CheckLoginAction(null, g_currentUser.name, g_currentUser.pass);
			action.run(this, this.checkloginResult);
			return;
		} else if (action.status == ERROR) {
			this.end(ERROR);
			return;
		}
	}
	,
	timeDiffStart:	function() {
		postDebug("target:"+this.target+" time:"+this.time+" - timeDiffStart", this);
		TimeDiffManager.instance.getTimeDiff(this, this.timeDiffResult);
	}
	,
	timeDiffResult:	function(timeDiff) {
		postDebug("target:"+this.target+" time:"+this.time+" - timeDiffResult:"+timeDiff, this);
		//准备精确的倒计时
		var action = new AttackAction(this.villageId, this.target, this.troops, this.type, this.catapult1, this.catapult2);
		action.time = this.time;
		action.timeDiff = timeDiff;
		action.run(this, this.attackResult);
	}
	,
	checkloginResult:	function(action) {
		if (action.status == SUCCESS) {
			var timer = new Timer(this, this.start, []);
			timer.setTimer(1000);//1 sec, not neccessary timer
			return;
		} else if (action.status == ERROR) {
			this.end(ERROR);
			return;
		}
	}
});
//****** end of Class ******


//Class ReadReportAction
function ReadReportAction(villageId) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);
}
ReadReportAction.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start:	function() {
		this.sendRequest("berichte.php", null, this.action1);
	}
	,
	action1:	function(doc) {
		if (doc.indexOf("<h1>报告</h1>") < 0) {
			postMessage("未打开报告页面,请访问<a href='http://"+g_sServerURL+"/berichte.php' target='blank' >这里</a>");
			this.end(SUCCESS);
			return;//Cancel Read Report Workflow
		}

		//<a href="berichte.php?id=18182548">齐格飞的鼎盛茶馆攻击无双城</a>
		var info = getStrBetween(doc, '<a href="berichte.php?id=', '</a>', null);
		if (info.indexOf(g_sTargetVillage) < 0) {
			postMessage("未找到对 "+g_sTargetVillage+" 的报告,请访问<a href='"+g_sServerURL+"/berichte.php' target='blank' >这里</a>");
			this.end(SUCCESS);
			return;//Cancel Read Report Workflow
		}
		var id = endWithStr(info, '">');//18182548

		//侦察
		if (info.indexOf("侦察") >= 0) {
			postMessage('侦察报告 <a target="blank" href="http://'+g_sServerURL+'/berichte.php?id='+info+'</a>');
			switchToNextTarget();
			this.end(SUCCESS);
			return;//Finished Read Report Workflow
		}

		postMessage('战斗报告 <a target="blank" href="http://'+g_sServerURL+'/berichte.php?id='+info+'</a>');
		this.sendRequest("berichte.php?id="+id, null, this.action2);
	}
	,
	action2:	function(doc) {
		if (doc.indexOf("缴获物") < 0) {
			postMessage("未取得 缴获物 报告信息");
			this.end(SUCCESS);
			return;//Cancel Read Report Workflow
		}
		//<td class="s7" colspan="10"><img class="res" src="img/un/r/1.gif">22 <img class="res" src="img/un/r/2.gif">82 <img class="res" src="img/un/r/3.gif">105 <img class="res" src="img/un/r/4.gif">0</td>
			
		//T3.5
		//<div class="res"><img class="r1" src="img/x.gif" alt="木材" title="木材" />137 | <img class="r2" src="img/x.gif" alt="泥土" title="泥土" />158 | <img class="r3" src="img/x.gif" alt="铁块" title="铁块" />115 | <img class="r4" src="img/x.gif" alt="粮食" title="粮食" />40</div>

		var info = getStrBetween(doc, '<div class="res">', '</div>', 500);
		var iLoot = 0;

		//木材
		var sNumber = getStrBetween(doc, 'title="木材" />', ' |', null);
		var iNumber = parseDecimal( sNumber );
		iLoot += iNumber;
		
		//泥土
		sNumber = getStrBetween(doc, 'title="泥土" />', ' |', null);
		iNumber = parseDecimal( sNumber );
		iLoot += iNumber;

		//泥土
		sNumber = getStrBetween(doc, 'title="铁块" />', ' |', null);
		iNumber = parseDecimal( sNumber );
		iLoot += iNumber;

		//泥土
		sNumber = getStrBetween(doc, 'title="粮食" />', '</div>', null);
		iNumber = parseDecimal( sNumber );
		iLoot += iNumber;

		postMessage("缴获物共计: "+iLoot);

		g_iTotalLoot += iLoot;
		document.getElementById('status').innerHTML = "累计缴获资源 "+g_iTotalLoot;

		var iLoad = 20;//禁卫兵最低运载量20
		if (iLoad < g_taskCommand.load) //optional, can be null
			iLoad = g_taskCommand.load;
		if (iLoot < iLoad) {//缴获物 < 运载量
			var messageArray = ["地主家也没有余粮了",
			                    "再去就得开奥迪回来了",
			                    "下次只能抢回伊利四个圈"];
			var index = Math.floor( Math.random() * messageArray.length );
			postMessage(messageArray[index] + "【齐格飞】");
			switchToNextTarget();
		}
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******


//Class EvaluateTimeDiff
function EvaluateTimeDiff(villageId) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);
	
	this.TRIAL_TOTAL = 10;
	this.TRIAL_INTERVAL = 100;//milliseconds;
	this.arrayTimeDiff;
	this.arrayRequestTime;
	this.i;
	this.timer = new Timer(this, this.request, null);
	
	this.timeDiff;
}
EvaluateTimeDiff.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start:	function() {
		this.arrayTimeDiff    = new Array(this.TRIAL_TOTAL);
		this.arrayRequestTime = new Array(this.TRIAL_TOTAL);
		
		this.i = 0;
		this.loop();
		return;//Start loop
	}
	,
	loop:		function() {
		if (this.i >= this.TRIAL_TOTAL) {
			this.result();
			return;//End of loop
		}
		
		var waiting = 1000 + this.TRIAL_INTERVAL * this.i;
		var now = new Date();
		waiting -= now.getTime() % 1000;
		if (waiting < 1000)
			waiting += 1000;
		//postMessage( getTimeStr(new Date(now.getTime() + waiting)) );
		this.timer.setTimer(waiting);
	}
	,
	request:	function() {
		this.arrayRequestTime[this.i] = new Date();
		this.sendRequest("a2b.php", null, this.response);
	}
	,
	response:	function(doc) {
		if (doc.indexOf("<h1>出兵</h1>") < 0) {
			postMessage("未打开 出兵 页面");
			this.end(RETRY);
			return;
		}
		var info = getStrBetween(doc, '<span id="tp1" class="b">', "</span>", 200);//<div id="ltime">用时 <b>16</b> ms<br>服务器时间: <span id="tp1" class="b">22:38:55</span> <span class="f6">(CST-15)</span></div>
		var estimateMS = this.arrayRequestTime[this.i].getTime() % 3600000;
		var realMS = parseTime(info) * 1000 % 3600000 + 500;//We suppose that server floors millisecs instead of rounds them
		var diff = realMS - estimateMS;
		if (diff >  1800000)
			diff -= 3600000;
		if (diff < -1800000)
			diff += 3600000;
		postMessage("本地时间 "+getTimeStr(this.arrayRequestTime[this.i])+" 服务器时间 "+info+" 时差 "+diff+"毫秒");
		if (diff > 60000 || diff < -60000)
			postMessage("时差超过1分钟，离谱");

		this.arrayTimeDiff[this.i] = diff;

		this.i++;
		this.loop();
		return;//Next loop
	}
	,
	result:	function() {
		var array = this.arrayTimeDiff;
		//var sum = 0;
		var earliest = array[0];
		for (var i=0; i<array.length; i++) {
			//sum += array[i];
			if (array[i] < earliest)
				earliest = array[i];
		}
		
		//this.timeDiff = Math.round(sum/array.length);
		this.timeDiff = earliest + 450;
		postMessage(array.length+"次尝试平均时差 "+this.timeDiff+"豪秒");
		//for (var i=0; i<this.arrayRequestTime.length; i++) {
		//	postMessage( getTimeStr(this.arrayRequestTime[i]) +" - "+ getTimeStr(new Date(this.arrayRequestTime[i].getTime()+this.timeDiff)) +" - "+ getTimeStr(new Date(this.arrayRequestTime[i].getTime()+this.arrayTimeDiff[i])) );
		//}
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******


//Class TimeDiffManager
//Singleton
function TimeDiffManager() {
	//Constructor, put Member Variables here.
	this.timeDiff = null;
	this.evaluateTime = null;
	
	this.evalStartTime = null;
	
	this.callerStack = new Array();//[]
	this.villageId = null;
}
TimeDiffManager.Extends(null, {
	//Prototype, put Member Functions here.
	getTimeDiff:	function(callerObj, callbackFunction) {
		if (!callbackFunction)
			return;
		
		if (this.timeDiff && (new Date().getTime() - this.evaluateTime.getTime()) < 300 * 1000) {
			//last evaluation is within  5 min, which means Not Expired
			callbackFunction.apply(callerObj, [this.timeDiff]);
			return;
		}
		
		//push caller info into Stack
		var caller = new Object();
		caller.callerObj  = callerObj;
		caller.callbackFunction = callbackFunction;
		this.callerStack.push(caller);
		//If current caller is the first one, start evaluation process;
		if (this.callerStack[0] == caller) {
			if (callerObj)
				this.villageId = callerObj.villageId;
			this.evaluateStart();
			return;
		}
	}
	,
	evaluateStart:	function() {
		this.evalStartTime = new Date();
		
		var action = new EvaluateTimeDiff(this.villageId);
		action.run(this, this.evaluateResult);
	}
	,
	evaluateResult:	function(action) {
		if (action.status == RETRY) {
			var action = new CheckLoginAction(null, g_currentUser.name, g_currentUser.pass);
			action.run(this, this.checkloginResult);
			return;
		}
		
		this.timeDiff = action.timeDiff;
		this.evaluateTime = new Date();

		//loop through stack, and callback all callers
		var callbackDueIn = this.evalStartTime.getTime() + TimeDiffManager.EVAL_IN_ADVANCE - this.evaluateTime.getTime() - this.timeDiff;
		var interval;
		if (callbackDueIn > 20 * 1000) {//leave 20 secs for final countdown
			interval = Math.floor((callbackDueIn - 20 * 1000) / this.callerStack.length);
			if (interval < 1000)
				interval = 1000;//1 sec
		} else {
			postError("倒计时时间不足，还剩："+ callbackDueIn / 1000 +"秒");
			interval = 1000;//1 sec
		}//By this interval, callbacks will occur discretely between now and callbackDueIn, so that the final actions will be smooth, without lag
		
		var array = this.callerStack;
		var caller;
		for (var i=0; i<array.length; i++) {
			caller = array[i];
			var timer = new Timer(caller.callerObj, caller.callbackFunction, [this.timeDiff]);
			timer.setTimer( (i+1)*interval );//a short delay between reponses to each caller
		}
		array.length = 0;
	}
	,
	checkloginResult:	function(action) {
		if (action.status == SUCCESS) {
			var timer = new Timer(this, this.evaluateStart, []);
			timer.setTimer(1000);//1 sec, not neccessary timer
			return;
		} else if (action.status == ERROR) {
			return;//Terminate
		}
	}
});
//Singleton Instance
TimeDiffManager.EVAL_IN_ADVANCE = 120 * 1000;//caller should call getTimeDiff() at least 120 seconds ahead of actual action.

//alert(document.getElementsByName("input").length);

//TimeDiffManager.EVAL_IN_ADVANCE = document.getElementById('txtEVAL_IN_ADVANCE').value * 1000;

TimeDiffManager.instance = new TimeDiffManager();



//****** end of Class ******


//Class TransportAction
function TransportAction(village1, village2, cargo, freights) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(village1.id);
	
	this.village1 = village1;
	this.village2 = village2;
	this.cargo = cargo;
	this.freights = freights;
}
TransportAction.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start:	function() {
		postMessage("从 "+this.village1.coordStr+" 到 "+this.village2.coordStr+" 运输"+this.freights+"车: "+this.cargo);
		var param = "id="+this.village1.marketId;//hidden param
		param += "&r1="+this.cargo[0];
		param += "&r2="+this.cargo[1];
		param += "&r3="+this.cargo[2];
		param += "&r4="+this.cargo[3];
		var coord = getCoordinate(this.village2.coordStr);
		param += "&dname=";//村庄名字
		param += "&x="+coord.x;//坐标x
		param += "&y="+coord.y;//坐标y
		this.sendRequest("build.php", param, this.action1);
		//postMessage(param);
	}
	,
	action1:	function(doc) {
		if (doc.indexOf("在市场你可以和其他玩家交易资源") < 0) {
			postMessage("未打开 市场/运输 页面");
			this.end(RETRY);
			return;
		}
		if (doc.indexOf('<p class="b c5">') >= 0) {//<p class="b c5">现有资源太少</p>
			postError( "市场报错: "+ getStrBetween(doc, '<p class="b c5">', '</p>', null) );
			this.end(ERROR);
			return;
		}
		
		var form = getStrBetween(doc, '<form method="POST" name="snd" action="build.php">', '<input type="image" value="ok"', 10000);
		var param = "";
		for (var i=0; i<8; i++) {
			var input = getStrBetween(form, "<input ", ">", 500);
			var type = getStrBetween(input, 'type="', '"', null);
			var name = getStrBetween(input, 'name="', '"', null);
			var value = getStrBetween(input, 'value="', '"', null);
			if (type == "hidden" || type == "text" || type == "Text") {
				param += name+"="+value+"&";
			}
			form = startFromStr(form, input, 2000);
		}
		
		var sDuration = getStrBetween(doc, "需时:</td><td>", "</td>", null);//需时:</td><td>0:03:32</td>
		var iDuration = parseTime(sDuration);
		
		postMessage("确认运输 需时: "+sDuration+" 小时");
		this.sendRequest("build.php", param, this.action2);
		//postMessage(param);
	}
	,
	action2:	function(doc) {
		if (doc.indexOf("资源已被运送") < 0) {
			postMessage("未打开 运输成功 页面");
		}
		postMessage("资源已被运送");
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******
