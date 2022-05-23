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
import { Component, OnDestroy, OnInit } from "@angular/core";
import { interval, timer, map, Observable, first, takeUntil } from "rxjs";
import { Subject } from "rxjs";

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
export class AppComponent implements OnInit, OnDestroy {
  private ngUnsubscribe = new Subject<void>();
  backendService = new BackendService();

  inputQuery: string = ""; // user input query term
  message: string = ""; // output message to user, just used now to inform invalid query
  viewCount: any = "???"; // count of views to display on screen
  commentCount: any = "???"; // count of comments to display on screen
  searchResult: any = "???"; // search result to display on screen

  detectChanges: boolean = false;

  ngOnInit() {
    // process observable data
    this.backendService.viewCount$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((data) => {
        if (data != this.viewCount) {
          this.detectChanges = true;
          this.viewCount = data;
        }
      });
    this.backendService.commentCount$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((data) => {
        if (data != this.commentCount) {
          this.detectChanges = true;
          this.commentCount = data;
        }
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
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

  // search function fires when search button is clicked. Throw error to user
  // when search box is empty or invalid
  search() {
    let searchTermRaw = this.inputQuery;
    const [isSearchTermValid, searchTerm] = this.isValid(searchTermRaw);
    if (isSearchTermValid) {
      this.backendService
        .search(searchTerm)
        .pipe(takeUntil(this.ngUnsubscribe))
        .subscribe({
          next: (result) => {
            this.searchResult = result;
          },
          error: (e) => {
            console.log("ERROR: ", e);
            this.search();
          },
        });
      this.message = "";
      this.display(this.viewCount, this.commentCount, this.searchResult);
    } else {
      this.message =
        "Your search input is invalid. Please enter a new search term!";
    }
  }

  /* check if the input search term is valid or not
    Example of a valid search term: 
    'text' -> txt is set
    '2-5'; '2 5'; '2, 5' -> min-max range is set
    '2' -> min is set
    RETURN 2 value: 
    - isValidQuery: Whether the entered search term is valid or not
    - searchterm: the reformatted searchterm cast to SearchTerm interface
  */
  private isValid(searchTermRaw: string) {
    let isValidQuery: boolean = true;
    let searchterm: SearchTerm = {};

    // split the input query to an array of values to process
    let searchComponents = searchTermRaw
      .split(/[,-]+/)
      .filter((element) => element.trim() !== "");

    // constraint: Empty value
    if (searchComponents.length == 0) isValidQuery = false;

    let txtSet: boolean = false;
    let minSet: boolean = false;
    let maxSet: boolean = false;

    // process the array of values and set each component if present
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
    // constraint: both txt and number are set
    if (txtSet && minSet) isValidQuery = false;

    // constraint: if max and min are both set then max >= min
    if (minSet && maxSet && isValidQuery) {
      isValidQuery = +searchComponents[0] <= +searchComponents[1];
    }

    return [isValidQuery, searchterm] as const;
  }
}
