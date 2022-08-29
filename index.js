
const express = require('express')
const db = require('./connection/db')
const bcrypt = require('bcrypt')
const session = require('express-session')
const flash = require('express-flash')

const app = express()
const port = 8000

app.set('view engine', 'hbs')//set view engine hbs
app.use('/assets', express.static(__dirname + '/assets'))//biar bisa baca path folder assets
app.use(express.urlencoded({extended: false}))

app.use(flash())
app.use(session({
    secret: 'serahserahgua',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 2 * 60 * 60 * 1000 // 2 hours ini
    }
}))


app.get('/contact', function(request,response){
    response.render("contact")
})

db.connect(function(err, client, done){
    if (err) throw err //untuk menampilkan error koneksi antara database dan nodejs

    app.get('/home', function(request,response){

        console.log(request.session);
        
        const query = `SELECT tb_projects.id, tittle, start_date, end_date, description, technologies, image, tb_user.name as author
        FROM tb_projects 
        LEFT JOIN tb_user ON tb_projects.user_id = tb_user.id ORDER BY id DESC;`
        // console.log(query);

        client.query(query, function(err, result){
            if (err) throw err //untuk menampilkan error dari query database

            // console.log(result.rows);
            let data = result.rows

            let dataP = data.map(function(isi){
            isi.technologies = isi.technologies.map(function(tekno) {
                if (tekno != 'undefined') {
                    return tekno
                } else {
                    tekno = undefined
                }
            })    

                return {
                    ...isi,
                    isLogin: request.session.isLogin,
                    start_date: getFullTime(isi.start_date),
                    end_date: getFullTime(isi.end_date),
                    duration: getDistanceTime(new Date(isi.start_date), new Date(isi.end_date))
                }
            })

            // console.log(dataP);
            response.render("home", {dataProject: dataP, user : request.session.user, isLogin: request.session.isLogin })
                
        })


    })

    app.get('/project-detail/:id', function(request,response){

        let id = request.params.id

        let query = `SELECT * FROM tb_projects WHERE id=${id}`

            client.query(query, function(err, result){
                if (err) throw err //untuk menampilkan error dari query database

                let data = result.rows
                // console.log(data);

                let dataP = data.map(function(isi){
                isi.technologies = isi.technologies.map(function(tekno) {
                    if (tekno != 'undefined') {
                        return tekno
                    } else {
                        tekno = undefined
                    }
                })

                    return {
                        ...isi,
                        isLogin: request.session.isLogin,
                        start_date: getFullTime(isi.start_date),
                        end_date: getFullTime(isi.end_date),
                        duration: getDistanceTime(new Date(isi.start_date), new Date(isi.end_date))
                    }
                
                    
                })
                console.log(dataP);
                response.render("project-detail", {data : dataP[0], isLogin: request.session.isLogin })
            })

    })

    //untuk menampilkan halaman
    app.get('/add-project', function(request,response){ 

        if (!request.session.user){
            request.flash('danger', 'anda belum login, harap login terlebih dahulu');
            return response.redirect('/login')
        }

        response.render("add-project", { user : request.session.user, isLogin: request.session.isLogin })
    })

    // untuk mengambil data dari add-project
    app.post('/add-project', function(request,response){

        let name = request.body.inputProject
        let start_date = request.body.inputStartDate
        let end_date = request.body.inputEndDate
        let description = request.body.inputDescription
        let nodeJs = request.body.inputNOJ
        let reactJs = request.body.inputREJ
        let nextJs = request.body.inputNEJ
        let java = request.body.inputJAV
        let image = request.body.inputImage
        // console.log(`koplak : `,nodeJs);

        //cara penulisan lain(biasa di gunakan programmer)
        // let {inputProject: name,
        //     inputStartDate: start_date,
        //     inputEndDate: end_date,
        //     inputDescription: description,
        //     nodeJs : inputNOJ,
        //     reactJs : inputREJ,
        //     nextJs : inputNEJ,
        //     java : inputJAV,
        //     inputImage: image} = request.body

            // console.log(request.body.inputNOJ);

                const idUser = request.session.user.id
        
                let query = `INSERT INTO tb_projects (tittle, start_date, end_date, description, technologies, image, user_id) VALUES 
                                ('${name}','${start_date}','${end_date}','${description}','{"${nodeJs}","${reactJs}","${nextJs}","${java}"}','images.jpg', '${idUser}')`
        
                client.query(query, function(err, result){
                    if (err) throw err //untuk menampilkan error dari query database
        
                    let data = result.rows
                    // console.log(data);
        
                    let dataP = data.map(function(isi){
                        return {
                            ...isi,
                            isLogin,
                            start_date: getFullTime(isi.start_date),
                            end_date: getFullTime(isi.end_date),
                            duration: getDistanceTime(new Date(isi.start_date), new Date(isi.end_date))
                        }
                    })

                    response.redirect('/home')

                })

    })

    //get ke hal edit blog untuk input data baru
    app.get('/edit-project/:idParams', function(request,response){ 

        if (!request.session.user){
            request.flash('danger', 'anda belum login, harap login terlebih dahulu');
            return response.redirect('/login')
        }

        let id = request.params.idParams

            let query = `SELECT * FROM tb_projects WHERE id=${id}`

            client.query(query, function(err, result){
                if (err) throw err //untuk menampilkan error dari query database

                let data = result.rows
                let start_date = getStart(data[0].start_date)
                let end_date = getStart(data[0].end_date)

                response.render("edit-project", { data: data[0], start_date, end_date,  user : request.session.user, isLogin: request.session.isLogin })
            })

    })

    //untuk post hasil edit ke hal home
    app.post('/edit-project/:idParams', function(request,response){ 

        let name = request.body.inputProject
        let start_date = request.body.inputStartDate
        let end_date = request.body.inputEndDate
        let description = request.body.inputDescription
        let nodeJs = request.body.inputNOJ
        let reactJs = request.body.inputREJ
        let nextJs = request.body.inputNEJ
        let java = request.body.inputJAV
        let image = request.body.inputImage
        let id = request.params.idParams

            let query =`UPDATE tb_projects 
                        SET tittle='${name}',
                            start_date='${start_date}',
                            end_date='${end_date}',
                            description='${description}',
                            technologies='{"${nodeJs}","${reactJs}","${nextJs}","${java}"}' WHERE id=${id}`

            client.query(query, function(err, result){
                if (err) throw err //untuk menampilkan error dari query database

                let data = result.rows
                // console.log(data);

                let dataP = data.map(function(isi){
                    return {
                        ...isi,
                        isLogin,
                        start_date: getFullTime(isi.start_date),
                        end_date: getFullTime(isi.end_date),
                        duration: getDistanceTime(new Date(isi.start_date), new Date(isi.end_date))
                    }
                })

                response.redirect('/home')

            })

    })

    //untuk hapus project
    app.get('/delete-project/:idParams', function(request, response) {

        if (!request.session.user){
            request.flash('danger', 'anda belum login, harap login terlebih dahulu');
            return response.redirect('/login')
        }

        let id = request.params.idParams

            let query = `DELETE FROM tb_projects WHERE id=${id}`

            client.query(query, function(err, result){
                if (err) throw err //untuk menampilkan error dari query database

                let data = result.rows
                // console.log(data);

                let dataP = data.map(function(isi){
                    return {
                        ...isi,
                        isLogin,
                        start_date: getFullTime(isi.start_date),
                        end_date: getFullTime(isi.end_date),
                        duration: getDistanceTime(new Date(isi.start_date), new Date(isi.end_date))
                    }
                })

                response.redirect('/home')

            })

    })

    app.get('/register', function(request,response){
        response.render("register")
    })

    app.post('/register', function(request,response){

        // console.log(request.body);
        let {inputName, inputEmail, inputPassword} = request.body

        const HSPSWD = bcrypt.hashSync(inputPassword, 10)

            let query = `INSERT INTO public.tb_user(name, email, password)
            VALUES ( '${inputName}', '${inputEmail}', '${HSPSWD}' );`
            
            client.query(query, function(err, result){
                if (err) throw err //untuk menampilkan error dari query database

                response.redirect('/register')
            })

        
    })

    app.get('/login', function(request,response){
        response.render("login")
    })

    app.post('/login', function(request,response){

        let { inputEmail, inputPassword} = request.body

            let query = ` SELECT * FROM tb_user WHERE email='${inputEmail}' `

            client.query(query, function(err, result){
                if (err) throw err //untuk menampilkan error dari query database

                // console.log(result.rows.length);
                console.log(result.rows[0]);

                if (result.rows.length == 0){
                    console.log("asu ki, emailmu rung kedaftar cokkk!!!")
                    request.flash('danger', 'email belum terdaftar')
                    return response.redirect('/login')
                } 

                const PCCKN = bcrypt.compareSync(inputPassword, result.rows[0].password)
                console.log(PCCKN);

                if (PCCKN) {
                    console.log("lan alhamdulillah, password njenengan nggih bener maszeh~");

                    request.session.isLogin = true
                    request.session.user = {
                        id: result.rows[0].id,
                        name: result.rows[0].name,
                        email: result.rows[0].email,
                    }
                    request.flash('success', 'Login berhasil')
                    response.redirect('/home')

                } else {
                    console.log("juaaangkrik ki,, entrane! passwordmu salah sU!!");
                    request.flash('danger', 'maaf, password anda salah')
                    response.redirect('/login')
                }

            })

    })

    app.get('/logout', function(request,response){
        request.session.destroy()
        response.redirect("/login")
    })

})



function getFullTime(time){

    let month = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]

    let date = time.getDate()
    let monthIndex = time.getMonth()
    let year = time.getFullYear()

    let hours = time.getHours()
    let minutes = time.getMinutes()

    // console.log(date);
    // console.log(month[monthIndex]);
    // console.log(year);

    // console.log(hours);
    // console.log(minutes);

    // if(hours < 10){
    //     hours = "0" + hours
    // }else if(minutes < 10){
    //     minutes = "0" + minutes
    // }
    
    // 12 Agustus 2022 09.04
    let fullTime = `${date} ${month[monthIndex]} ${year}`
    // console.log(fullTime);
    return fullTime
}

function getDistanceTime(startd, endd){
    let mulai = new Date(startd)
    let akhir = new Date(endd)

    let duration = akhir - mulai
    
    //miliseconds  1000 = 1 detik
    //second in hours 3600 
    // hours in day 23 (karena ketika sudah sampai jam 23.59 akan kembali ke 00.00)
    // day in month 31

    let distanceDay = Math.floor(duration / (1000 * 3600 * 23));
    let distanceMonth = Math.floor(distanceDay / 31);

    
    if (distanceMonth <= 0) {
        return distanceDay + " Hari"
    } else 
        return distanceMonth + " Bulan "
    
}

function getStart(start) {
    let d = new Date(start),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

    if (month.length < 2) {
        month = '0' + month
    } 

    if (day.length < 2) {
        day = '0' + day
    }

    return [year, month, day].join('-')

}

app.listen(port, function(){
    console.log(`server running on port ${port}`);
} 
)