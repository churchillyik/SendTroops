//Class BuildVillageAction
function BuildVillageAction(villageId, buildQueue) 
{
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);

	this.buildQueue = buildQueue;
	this.buildId    = null;
	this.busySeconds = 0;
}

BuildVillageAction.Extends(BaseHttpAction, 
{
	//Prototype, put Member Functions here.
	start:	function() 
	{
		if (this.buildQueue && this.buildQueue.length>0) 
		{
			this.buildId = this.buildQueue[0];
		} 
		else 
		{
			this.buildId = null;//if no specified ID, auto build resources.
		}
		
		var url;
		if ( 1 <=this.buildId && this.buildId<= 18 || this.buildId == null ) 
		{
			url = "dorf1.php";
		} 
		else if ( 19 <=this.buildId && this.buildId<= 40 ) 
		{
			url = "dorf2.php";
		} 
		else 
		{
			postError("建筑ID错误 "+this.buildId);
			this.end(ERROR);
			return;
		}
		
		if (g_romeBuild == 1 && this.buildId == null) 
		{
			//罗马内城
			postError("罗马内城建设队列完毕");
			this.end(ERROR);
			return;
		}
		
		if (g_romeBuild == 1 && this.buildId <= 18) 
		{
			//罗马内城
			postError("建筑ID错误 "+this.buildId +" 不属于罗马内城");
			this.end(ERROR);
			return;
		}
		if (g_romeBuild == 2 && this.buildId > 18) 
		{
			//罗马外城
			postError("建筑ID错误 "+this.buildId +" 不属于罗马外城");
			this.end(ERROR);
			return;
		}
		
		postDebug("准备建村庄: "+ this.villageId, this);
		this.sendRequest(url, null, this.action1);
	},
	action1:	function(doc) 
	{
		if (doc.indexOf("<map name=") < 0) 
		{
			//<map name="rx"> or <map name="map1">
			postMessage("未打开 村庄 页面");
			this.end(RETRY);
			return;
		}

		//In Building or Not
		this.busySeconds = 0;
		if (doc.indexOf("建造中") >= 0) 
		{
			var info = startFromStr(doc, "建造中", 2000);
			var name;
			while (true) 
			{
				name = getStrBetween(info, '"取消"></a></td><td>', '</td>', null);//<table ...><tr><td>...title="取消"></a></td><td>市场 (等级 14)</td>...
				if (name == "")
					break;//not found
				var inner = true;
				if (name.indexOf("伐木场") >= 0 || name.indexOf("黏土矿") >= 0 || name.indexOf("铁矿场") >= 0 || name.indexOf("农场") >= 0)
					inner = false;
				if (g_romeBuild == 0 || (g_romeBuild == 1 && inner) || (g_romeBuild == 2 && !inner))
					break;//found
				info = startFromStr(info, ' 点</td></tr>', 2000);//try next item
			}
			if (name != "") 
			{
				var time = getStrBetween(info, "<span id=timer", "</span>", null);//<span id=timer1>0:29:45</span> 小时	timer2	timer3
				time = startFromStr(time, ">", 200);//1>0:29:45
				if (time.indexOf("Popup(2,5)") >= 0) {//<a href="#" onClick="Popup(2,5);return false;"><span class="c0t">0:00:0<br/>
					time = "服务器 - 事件过多，瞬间阻塞 (00:00:0?)"
					this.busySeconds = RETRY_SEC;//wait 5 more seconds, will be 10 total
				} 
				else 
				{
					this.busySeconds = parseTime(time);
				}
				postMessage("建造中: "+ name +" 还需: "+ time);
				
				this.end(SUCCESS);
				return;
			}
		}
		
		//If has Queue
		if (this.buildId) 
		{
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
	},
	buildResult:	function(action) 
	{
		if (action.status == SUCCESS) 
		{
			//Remove id from buildQueue, if it is the first of the queue.
			var id = action.buildingId;
			var queue = this.buildQueue;
			if (queue.length > 0 && queue[0] == id) 
			{
				for (i = 0; i < queue.length - 1; i++) 
				{
					queue[i] = queue[i + 1];
				}
				queue.length -= 1;
				postDebug("remove "+id+" from Queue. now Queue length = "+queue.length, this);
			}

			this.action1(action.doc);
		} 
		else 
		{
			this.end(action.status);//ERROR or NOT_READY or RETRY
		}
	}
});
//****** end of Class ******