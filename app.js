const http = require('http');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const Feed = require('feed')
const express = require('express');
const app = express();
const md5 = require('md5');
const cache = require('memory-cache');

const PORT = 3000;
const WEEIA_URL = 'http://www.weeia.p.lodz.pl/';
const KOMUNIKATY_KEY = 'komunikaty';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 min

app.get('/komunikaty', feedKomunikaty);

function feedKomunikaty(request, res, next){
	let feed = cache.get(KOMUNIKATY_KEY);
	if(feed) {
		sendFeed(feed);
		return;
	}
	
	fetchFeed();
	
	function fetchFeed(){
		feed = new Feed({
			title: 'Komunikaty dziekanatu WEEIA',
			description: '',
			id: WEEIA_URL + KOMUNIKATY_KEY,
		});
		console.log('Fetching ' + WEEIA_URL + '..');
		http.get(WEEIA_URL, handleGetSite).on('error', handleError);
	}
	
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
		console.log('Parsing HTML..');
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
		cache.put(KOMUNIKATY_KEY, feed, CACHE_EXPIRY_MS, handleCacheExpired);
		sendFeed(feed);
	}
	
	function sendFeed(feed){
		res.set('Content-Type', 'application/atom+xml');
		res.send(feed.atom1());
		console.log('Feed sent.');
		next();
	}
	
	function handleCacheExpired(key, value){
		console.log(`Cache ${key} expired.`);
	}
	
}

app.listen(PORT);