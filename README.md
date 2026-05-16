
Inside root folder:
 npm i

Inside client folder:
 npm i

Inside root run:
 npm start  



Suggested Changes

1) Start using Typescript for backend instead of JS ( use KOA )
2) What I would suggest just to keep code clean, for example we have bankingService so currently it's within service folder and it's controller is in controllers folder.. I suggest that create a parent folder called either backend or what you like and within that create a folder called banking and within banking folder create it's personal routes , controllers and handlers and export them .... This would help to keep the code clean when we add more
3) ideally we do not assign a separate file to create a single table , they should all come within a single file let say - MvpDbSchema (if there are separate products then two files having respective table schemas)
4) also start using ORM to manage queries and to query the DB in future create a separate folder where we wil define basic function like getRecords , updateRecords , insertRecords etc
that will be used codebase wide to manage DB queries , we wont be writing raw queries for each handler - ORM can be knex or any you like
