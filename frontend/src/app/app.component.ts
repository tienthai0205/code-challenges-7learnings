/*
This is a practical test on a minimal made-up application. 
There are two main features:
 - We have a set of statistics (e.g. number of views, comments) that we want to display to the user.
 - User can send a search request either containing a text or number range, the response should be displayed along with the statistics.
The exact task is described in the comments below.
Solution shouldn't take more than two hours.
UX and styling will not be evaluated (don't spend time on them).
*/

import { HttpErrorResponse } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { interval, timer, map, Observable } from "rxjs";

/*
Search query representation.

User can either search by text (`txt` is set) or number range (`min`, `max` is set).
It is possible for user to specify only one of `min` or `max`, this way only one of the bounds will be accounted for.
*/
interface SearchTerm {
  txt?: string;
  min?: number;
  max?: number;
}

/*
Mock 'backend' service we will be using to emulate requests.
*/
export class BackendService {
  // These are the statistics for our app that we want to display
  viewCount$: Observable<number> = interval(700).pipe(map((x) => 50 + (x % 2)));
  commentCount$: Observable<number> = interval(1500).pipe(map((x) => 1 + x));

  // Use this method to send a search request to our 'server'.
  // The response of the server is `true` if value was found, or `false` otherwise.
  // Make sure the term is valid before calling (see task description below).
  search(term: SearchTerm) {
    return timer(3000).pipe(
      map((x) => {
        if (Math.random() < 0.5) {
          return Math.random() < 0.5;
        } else {
          throw new HttpErrorResponse({ status: 500 });
        }
      })
    );
  }
}

/*
TASK:
  1. User input 
    Make it possible for user to input the search term.
    There is minimal template already defined, but it is only for illustration purposes to help you understand the task. Feel free to change it as you like.
    When user clicks the search button, backend service's search method should be called (if search term is valid, see next task).
    Don't spend time on styling, it will not be evaluated.
  
  2. Input validation
    A valid search term must satisfy:
      - At least one member (`txt`, `min` or `max`) should be set.
      - If set, `txt` must be a non-empty string.
      - If set, `min`, `max` must be numbers. Floating poinst / integers are both allowed.
      - If both set, `min` should be <= `max`.
      - {`txt`} and {`min`, `max`} members are mutually exclusive.
        If `txt` is set, `min` and `max` should be unset.
        If either `min` or `max` is set, `txt` should be unset.
  
  3. Handling observables
    - Display all up-to-date values from backendService.viewCount$, backendService.commentCount$ and the result  of the search request (if any present).
    - Try to limit number of calls to the display method (pretend that displaying values is expensive operation).
      - Avoid calling the method consecutively with same values as currently displayed.
      - (bonus) 200 millisecond delay between value change and display is acceptable.
        For example, there is a new value from viewCount$ at X milliseconds and a new search term from user at time X+100 milliseconds.
        Instead of calling display method two times for each of these updates, you should call it once with both updated values.
  
  4. Error Handling
    - Call to backend service's `search` method has a chance of throwing an error.
      If an error is thrown, the request should be retried (if search term hasn't changed)
  
  Good luck!
*/

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent implements OnInit {
  backendService = new BackendService();

  inputQuery: string = "";
  viewCount: any = "???";
  commentCount: any = "???";
  searchResult: any = "???";

  detectChanges: boolean = false;

  ngOnInit(): void {
    this.backendService.viewCount$.subscribe((el) => {
      if (el != this.viewCount) {
        this.viewCount = el;
        this.detectChanges = true;
        this.display(this.viewCount, this.commentCount, this.searchResult);
      }
    });
    this.backendService.commentCount$.subscribe((el) => {
      if (el != this.commentCount) {
        this.detectChanges = true;
        this.commentCount = el;
        this.display(this.viewCount, this.commentCount, this.searchResult);
      }
    });
  }
  // Example how the display method's signature could look like (you are free to change this)
  display(
    viewCount: number,
    commentCount: number,
    searchResult: boolean | null
  ) {
    this.searchResult = searchResult;
    this.viewCount = viewCount;
    this.commentCount = commentCount;
  }

  search() {
    let searchTermRaw = this.inputQuery;

    const [isSearchTermValid, searchTerm] = this.isValid(searchTermRaw);
    if (isSearchTermValid) {
      this.backendService.search(searchTerm).subscribe(
        (result) => {
          this.searchResult = result;
        },
        (error) => {
          console.log("ERROR: ", error);
          this.search();
        }
      );
    }
    this.display(this.viewCount, this.commentCount, this.searchResult);
  }

  private isValid(searchTermRaw: string) {
    let isValidQuery: boolean = true;
    let searchterm: SearchTerm = {};
    let searchComponents = searchTermRaw
      .split(/[, ]+/)
      .filter((element) => element !== "");

    if (searchComponents.length == 0) isValidQuery = false;

    let txtSet: boolean = false;
    let minSet: boolean = false;
    let maxSet: boolean = false;

    searchComponents.forEach((identifier) => {
      if (!+identifier) {
        txtSet = true;
        searchterm.txt = identifier;
      } else {
        if (minSet && !maxSet) {
          maxSet = true;
          searchterm.max = +identifier;
        }
        if (!minSet) {
          minSet = true;
          searchterm.min = +identifier;
        }
      }
    });
    if (txtSet && minSet) isValidQuery = false;

    if (minSet && maxSet && isValidQuery) {
      isValidQuery = +searchComponents[0] <= +searchComponents[1];
    }

    return [isValidQuery, searchterm] as const;
  }
}
