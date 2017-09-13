const http = require('http');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const Feed = require('feed')
const express = require('express');
const app = express();
const md5 = require('md5');

const PORT = 3000;
const WEEIA_URL = 'http://www.weeia.p.lodz.pl/';

app.get('/komunikaty', feedKomunikaty);

function feedKomunikaty(request, res, next){
	let feed = new Feed({
		title: 'Komunikaty dziekanatu WEEIA',
		description: '',
		id: WEEIA_URL + 'komunikaty',
	});
	
	http.get(WEEIA_URL, handleGetSite).on('error', handleError);
	
	function handleError(e){
		console.error('Error: ' + e.message);
		next(e);
	}
	
	function handleGetSite(food){
		if(food.statusCode !== 200){
			console.error('Error: ' + food.statusCode + ' ' + food.statusMessage);
			food.resume();
			return;
		}
		food.setEncoding('utf8');
		var html = '';
		food.on('data', function(chunk){ html += chunk; });
		food.on('end', () => { handleData(html) });
	}
	
	function handleData(html){
		const dom = new JSDOM(html);
		var items = dom.window.document.querySelectorAll("div.Komunikaty .Content .Item");
		for(let it of items){
			let entry = {
				date: new Date(Date.parse(it.querySelector(".Date").textContent)),
				title: it.querySelector(".Title").textContent,
				content: it.querySelector(".Preview").innerHTML,
				link: WEEIA_URL
			};
			entry.id = "tag:www.weeia.p.lodz.pl,"+entry.date+":"+md5(entry.date+"\n"+entry.title+"\n"+entry.content);
			feed.addItem(entry);
		}
		res.set('Content-Type', 'application/atom+xml');
		res.send(feed.atom1());
		next();
	}
}

app.listen(PORT);